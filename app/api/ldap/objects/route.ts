import { configService } from '@/lib/server/config-service';
import { ldapService } from '@/lib/server/ldap/ldap-service';
import { getSession } from '@/lib/server/session-store';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profiles = await configService.getProfiles();
  const profile = profiles.find((p) => p.id === session.profileId);

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 400 });
  }
  const password = session.password;
  try {
    const { ouDN, objectType, attributes } = await request.json();

    if (!ouDN || !objectType || !attributes) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await ldapService.createObject(ouDN, objectType, attributes, session.userDN, password);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('LDAP Create Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create LDAP object' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profiles = await configService.getProfiles();
  const profile = profiles.find((p) => p.id === session.profileId);

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 400 });
  }
  const password = session.password;

  try {
    const { dn, action, payload } = await request.json();

    if (action === 'move') {
      await ldapService.moveObject(dn, payload.newOU, session.userDN, password);
      const rdn = dn.match(/(?:\\.|[^,])+/)?.[0] || dn.split(',')[0];
      const newDN = `${rdn},${payload.newOU}`;
      return NextResponse.json({ success: true, newDN });
    } else if (action === 'update') {
      await ldapService.updateObject(dn, payload.attributes, session.userDN, password);
    } else if (action === 'toggle-member') {
      await ldapService.toggleGroupMember(
        payload.groupDN,
        payload.memberDN,
        payload.type,
        session.userDN,
        password
      );
    } else if (action === 'password') {
      await ldapService.updatePassword(dn, payload.newPassword, session.userDN, password);
    } else if (action === 'toggle-status') {
      await ldapService.toggleObjectStatus(dn, payload.enabled, session.userDN, password);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('LDAP Update Error:', error);
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profiles = await configService.getProfiles();
  const profile = profiles.find((p) => p.id === session.profileId);

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 400 });
  }
  const password = session.password;
  try {
    const { dn } = await request.json();

    if (!dn) {
      return NextResponse.json({ error: 'Object DN is required' }, { status: 400 });
    }

    await ldapService.deleteObject(dn, session.userDN, password);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('LDAP Delete Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete LDAP object' },
      { status: 500 }
    );
  }
}
