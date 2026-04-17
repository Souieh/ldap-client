import { configService } from '@/lib/server/config-service';
import { ldapService } from '@/lib/server/ldap/ldap-service';
import { getSession } from '@/lib/server/session-store';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ouDN, objectType, scope, query } = body;

    if (!ouDN || !objectType) {
      return NextResponse.json({ error: 'ouDN and objectType are required' }, { status: 400 });
    }

    const profiles = await configService.getProfiles();
    const profile = profiles.find((p) => p.id === session.profileId);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 });
    }

    let results: any[] = [];
    const searchDN = ouDN === 'ROOT' ? profile.config.baseDN : ouDN;
    const searchScope = scope || (ouDN === 'ROOT' ? 'sub' : 'one');

    switch (objectType.toLowerCase()) {
      case 'user':
        results = await ldapService.searchUsers(
          profile.config,
          session.userDN,
          session.password,
          searchDN,
          searchScope as any,
          query
        );
        break;
      case 'computer':
        results = await ldapService.searchComputers(
          profile.config,
          session.userDN,
          session.password,
          searchDN,
          searchScope as any,
          query
        );
        break;
      case 'group':
        results = await ldapService.searchGroups(
          profile.config,
          session.userDN,
          session.password,
          searchDN,
          searchScope as any,
          query
        );
        break;
      default:
        return NextResponse.json({ error: 'Invalid objectType' }, { status: 400 });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    );
  }
}
