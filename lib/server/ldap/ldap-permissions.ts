import { LDAPConfig } from '@/lib/types/config';
import { Control } from 'ldapts';
import { getClient } from './ldap-helpers';
import {
  getAppliesToFromFlags,
  getRightsFromMask,
  parseSecurityDescriptor,
  sidToLdapFilter,
  sidToString,
} from './sddl-parser';

export interface ACEUI {
  sid: string;
  name?: string;
  type: 'ALLOW' | 'DENY' | 'OTHER';
  rights: string[];
  inherited: boolean;
  appliesTo: string;
}

/**
 * BER encoding of SEQUENCE { INTEGER 4 } — requests DACL only (SD_FLAGS = 0x04).
 * Avoids needing SeSecurityPrivilege that full SD reads require.
 *
 * OID: 1.2.840.113556.1.4.801  (LDAP_SERVER_SD_FLAGS_OID)
 * Value: 30 03 02 01 04
 */
const SD_FLAGS_CONTROL = new Control('1.2.840.113556.1.4.801', {
  //@ts-ignore
  value: Buffer.from('3003020104', 'hex'),
});
const WELL_KNOWN_SIDS: Record<string, string> = {
  'S-1-0-0': 'Null Authority',
  'S-1-1-0': 'Everyone',
  'S-1-3-0': 'Creator Owner',
  'S-1-3-1': 'Creator Group',
  'S-1-5-7': 'Anonymous',
  'S-1-5-9': 'Enterprise Domain Controllers',
  'S-1-5-10': 'Self',
  'S-1-5-11': 'Authenticated Users',
  'S-1-5-12': 'Restricted Code',
  'S-1-5-13': 'Terminal Server Users',
  'S-1-5-14': 'Remote Interactive Logon',
  'S-1-5-15': 'This Organization',
  'S-1-5-17': 'IUSR',
  'S-1-5-18': 'Local System',
  'S-1-5-19': 'Local Service',
  'S-1-5-20': 'Network Service',
  // CN=Builtin groups (S-1-5-32-*)
  'S-1-5-32-544': 'Administrators',
  'S-1-5-32-545': 'Users',
  'S-1-5-32-546': 'Guests',
  'S-1-5-32-547': 'Power Users',
  'S-1-5-32-548': 'Account Operators',
  'S-1-5-32-549': 'Server Operators',
  'S-1-5-32-550': 'Print Operators',
  'S-1-5-32-551': 'Backup Operators',
  'S-1-5-32-552': 'Replicators',
  'S-1-5-32-554': 'Pre-Windows 2000 Compatible Access',
  'S-1-5-32-555': 'Remote Desktop Users',
  'S-1-5-32-556': 'Network Configuration Operators',
  'S-1-5-32-557': 'Incoming Forest Trust Builders',
  'S-1-5-32-558': 'Performance Monitor Users',
  'S-1-5-32-559': 'Performance Log Users',
  'S-1-5-32-560': 'Windows Authorization Access Group',
  'S-1-5-32-561': 'Terminal Server License Servers',
  'S-1-5-32-562': 'Distributed COM Users',
  'S-1-5-32-568': 'IIS_IUSRS',
  'S-1-5-32-569': 'Cryptographic Operators',
  'S-1-5-32-573': 'Event Log Readers',
  'S-1-5-32-574': 'Certificate Service DCOM Access',
  'S-1-5-32-575': 'RDS Remote Access Servers',
  'S-1-5-32-576': 'RDS Endpoint Servers',
  'S-1-5-32-577': 'RDS Management Servers',
  'S-1-5-32-578': 'Hyper-V Administrators',
  'S-1-5-32-579': 'Access Control Assistance Operators',
  'S-1-5-32-580': 'Remote Management Users',
  'S-1-5-32-582': 'Storage Replica Administrators',
};

/**
 * Domain-relative RIDs — only safe to use when the SID is under a domain prefix
 * (i.e. starts with S-1-5-21-). We don't match these for built-in (S-1-5-32-*)
 * or other authorities to avoid false positives across domains.
 */
const DOMAIN_RIDS: Record<string, string> = {
  '500': 'Administrator',
  '501': 'Guest',
  '502': 'krbtgt',
  '512': 'Domain Admins',
  '513': 'Domain Users',
  '514': 'Domain Guests',
  '515': 'Domain Computers',
  '516': 'Domain Controllers',
  '517': 'Cert Publishers',
  '518': 'Schema Admins',
  '519': 'Enterprise Admins',
  '520': 'Group Policy Creator Owners',
};

function resolveSidFallback(sid: string): string | undefined {
  if (WELL_KNOWN_SIDS[sid]) return WELL_KNOWN_SIDS[sid];

  // Only apply domain RID names for actual domain SIDs (S-1-5-21-*)
  if (sid.startsWith('S-1-5-21-')) {
    const rid = sid.split('-').pop() ?? '';
    if (DOMAIN_RIDS[rid]) return DOMAIN_RIDS[rid];
  }

  return undefined;
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

    // --- 1. Fetch the security descriptor ---
    const { searchEntries } = await client.search(
      dn,
      {
        scope: 'base',
        attributes: ['nTSecurityDescriptor'],
        explicitBufferAttributes: ['nTSecurityDescriptor'], // must be a raw Buffer
      },
      SD_FLAGS_CONTROL // request DACL only — avoids SeSecurityPrivilege
    );

    if (searchEntries.length === 0) return [];

    const sdBuffer = searchEntries[0].nTSecurityDescriptor as Buffer;
    if (!sdBuffer || !Buffer.isBuffer(sdBuffer)) {
      console.warn(
        'nTSecurityDescriptor was not returned as a Buffer — check explicitBufferAttributes'
      );
      return [];
    }

    const sd = parseSecurityDescriptor(sdBuffer);
    if (!sd.dacl || sd.dacl.length === 0) return [];

    // --- 2. Resolve SIDs to display names via AD lookup ---
    const uniqueSids = Array.from(new Set(sd.dacl.map((ace) => ace.sid).filter(Boolean)));
    const sidToName = new Map<string, string>();

    const chunkSize = 20;
    const searchBases = [
      config.baseDN,
      `CN=Builtin,${config.baseDN}`, // built-in groups live here
    ];

    for (let i = 0; i < uniqueSids.length; i += chunkSize) {
      const chunk = uniqueSids.slice(i, i + chunkSize);
      const filter = `(|${chunk.map((sid) => `(objectSid=${sidToLdapFilter(sid)})`).join('')})`;

      for (const base of searchBases) {
        try {
          const { searchEntries: resolved } = await client.search(base, {
            filter,
            scope: 'sub',
            attributes: ['objectSid', 'displayName', 'cn', 'sAMAccountName'],
            explicitBufferAttributes: ['objectSid'],
          });
          for (const entry of resolved) {
            const rawSid = entry.objectSid as Buffer;
            if (!rawSid || !Buffer.isBuffer(rawSid)) continue;

            const sidStr = sidToString(rawSid);
            const name = String(entry.displayName ?? entry.cn ?? entry.sAMAccountName ?? '');

            if (sidStr && name) sidToName.set(sidStr, name);
          }
        } catch (err) {
          // CN=Builtin search may fail if account lacks permission — that's ok,
          // static map above will cover most cases
        }
      }
    }

    // --- 3. Map ACEs to UI-friendly format ---
    return sd.dacl.map((ace) => {
      const name = sidToName.get(ace.sid) ?? resolveSidFallback(ace.sid) ?? ace.sid; // last resort: show the raw SID

      return {
        sid: ace.sid,
        name,
        type: ace.type,
        rights: getRightsFromMask(ace.mask),
        inherited: ace.inherited,
        appliesTo: getAppliesToFromFlags(ace.flags),
      };
    });
  } finally {
    await client.unbind();
  }
}
