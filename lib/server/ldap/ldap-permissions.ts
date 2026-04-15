import { getClient } from './ldap-helpers';
import { LDAPConfig } from '@/lib/types/config';
import { parseSecurityDescriptor, getRightsFromMask, sidToString } from './sddl-parser';

// Basic structures for AD Permissions
export interface ACEUI {
  sid: string;
  name?: string;
  type: 'ALLOW' | 'DENY' | 'OTHER';
  rights: string[];
  inherited: boolean;
  appliesTo: string;
}

export async function getObjectPermissions(
  config: LDAPConfig,
  userDN: string,
  password: string,
  dn: string
): Promise<ACEUI[]> {
  const client = getClient(config);
  try {
    await client.bind(userDN, password);

    // To read the security descriptor, we need to specify that we want the DACL (0x4)
    // We do this via the LDAP_SERVER_SD_FLAGS_OID control.
    const { searchEntries } = await client.search(dn, {
      scope: 'base',
      attributes: ['nTSecurityDescriptor'],
      // Note: ldapts might not support OIDs in all versions easily,
      // but AD often returns nTSecurityDescriptor if requested.
    });

    if (searchEntries.length === 0) return [];

    const sdBuffer = searchEntries[0].nTSecurityDescriptor as Buffer;
    if (!sdBuffer) return [];

    const sd = parseSecurityDescriptor(sdBuffer);
    if (!sd.dacl) return [];

    // 1. Get all unique SIDs to resolve them
    const uniqueSids = Array.from(new Set(sd.dacl.map(ace => ace.sid)));

    // 2. Resolve SIDs to names by searching in AD
    // SID search filter example: (objectSid=S-1-5-21-...)
    const sidToName = new Map<string, string>();

    // Resolve in chunks (e.g., 20 SIDs at a time)
    const chunkSize = 20;
    for (let i = 0; i < uniqueSids.length; i += chunkSize) {
      const chunk = uniqueSids.slice(i, i + chunkSize);
      const filter = `(|${chunk.map(sid => `(objectSid=${sid})`).join('')})`;
      try {
        const { searchEntries: resolvedEntries } = await client.search(config.baseDN, {
          filter,
          scope: 'sub',
          attributes: ['objectSid', 'cn', 'displayName', 'sAMAccountName'],
        });

        resolvedEntries.forEach(entry => {
          const objectSid = entry.objectSid as Buffer;
          if (objectSid) {
            const sidStr = sidToString(objectSid);
            const name = String(entry.displayName || entry.cn || entry.sAMAccountName || '');
            sidToName.set(sidStr, name);
          }
        });
      } catch (e) {
        console.error('Error resolving SIDs:', e);
      }
    }

    // Well-known SIDs and RIDs
    const SYSTEM_SIDS: Record<string, string> = {
      'S-1-5-18': 'Local System',
      'S-1-5-11': 'Authenticated Users',
      'S-1-1-0': 'Everyone',
      'S-1-5-32-544': 'Administrators',
      'S-1-5-32-545': 'Users',
      'S-1-5-32-548': 'Account Operators',
      'S-1-5-19': 'LocalService',
      'S-1-5-20': 'NetworkService',
      'S-1-5-7': 'Anonymous',
    };

    const WELL_KNOWN_RIDS: Record<string, string> = {
      '500': 'Administrator',
      '512': 'Domain Admins',
      '513': 'Domain Users',
      '514': 'Domain Guests',
      '515': 'Domain Computers',
      '519': 'Enterprise Admins',
    };

    return sd.dacl.map(ace => {
      let appliesTo = 'This object';
      if ((ace.flags & 0x01) && (ace.flags & 0x02)) appliesTo = 'This object and all child objects';
      else if (ace.flags & 0x01) appliesTo = 'Child objects only';
      else if (ace.flags & 0x02) appliesTo = 'This object and immediate children';

      // Humanize SID
      let humanName = sidToName.get(ace.sid);
      if (!humanName) {
        if (SYSTEM_SIDS[ace.sid]) {
          humanName = SYSTEM_SIDS[ace.sid];
        } else {
          const rid = ace.sid.split('-').pop() || '';
          humanName = WELL_KNOWN_RIDS[rid];
        }
      }

      return {
        sid: ace.sid,
        name: humanName || ace.sid,
        type: ace.type,
        rights: getRightsFromMask(ace.mask),
        inherited: ace.inherited,
        appliesTo,
      };
    });
  } finally {
    await client.unbind();
  }
}
