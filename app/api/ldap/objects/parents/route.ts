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
    const { objectDN } = body;

    if (!objectDN) {
      return NextResponse.json({ error: 'objectDN is required' }, { status: 400 });
    }

    const profiles = await configService.getProfiles();
    const profile = profiles.find((p) => p.id === session.profileId);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 });
    }

    const members = await ldapService.getObjectParents(
      profile.config,
      session.userDN,
      session.password,
      objectDN
    );

    return NextResponse.json(members);
  } catch (error) {
    console.error('Fetch group members error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch group members' },
      { status: 500 }
    );
  }
}
