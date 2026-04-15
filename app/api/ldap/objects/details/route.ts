import { configService } from '@/lib/server/config-service';
import { ldapService } from '@/lib/server/ldap/ldap-service';
import { getSession } from '@/lib/server/session-store';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dn = searchParams.get('dn');

    if (!dn) {
      return NextResponse.json({ error: 'dn is required' }, { status: 400 });
    }

    const profiles = await configService.getProfiles();
    const profile = profiles.find((p) => p.id === session.profileId);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 });
    }

    const object = await ldapService.getObjectByDN(
      profile.config,
      session.userDN,
      session.password,
      dn
    );

    return NextResponse.json(object);
  } catch (error) {
    console.error('Fetch object details error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch object details' },
      { status: 500 }
    );
  }
}
