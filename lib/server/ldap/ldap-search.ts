import { ADComputer, ADGroup, ADUser, LDAPConfig } from '@/lib/types/config';
import { getClient, mapToADComputer, mapToADGroup, mapToADUser } from './ldap-helpers';

export async function searchUsers(
  config: LDAPConfig,
  userDN: string,
  password: string,
  ouDN: string,
  scope: 'base' | 'one' | 'sub' = 'one'
): Promise<ADUser[]> {
  const client = getClient(config);
  try {
    await client.bind(userDN, password);
    const { searchEntries } = await client.search(ouDN, {
      filter: '(&(objectClass=person)(objectClass=user))',
      scope,
      attributes: [
        'dn',
        'objectClass',
        'cn',
        'sAMAccountName',
        'mail',
        'displayName',
        'telephoneNumber',
        'title',
        'department',
        'userAccountControl',
        'lastLogonTimestamp',
        'whenCreated',
        'whenChanged',
      ],
    });

    return searchEntries.map((entry) => mapToADUser(entry));
  } finally {
    await client.unbind();
  }
}

export async function getObjectByDN(
  config: LDAPConfig,
  userDN: string,
  password: string,
  dn: string
): Promise<any> {
  const client = getClient(config);
  try {
    await client.bind(userDN, password);
    const { searchEntries } = await client.search(dn, {
      scope: 'base',
    });

    if (searchEntries.length === 0) {
      throw new Error('Object not found');
    }

    const entry = searchEntries[0];
    const objectClass = entry.objectClass as string[];

    if (objectClass.includes('user')) return mapToADUser(entry);
    if (objectClass.includes('group')) return mapToADGroup(entry);
    if (objectClass.includes('computer')) return mapToADComputer(entry);

    return entry;
  } finally {
    await client.unbind();
  }
}

export async function getGroupMembers(
  config: LDAPConfig,
  userDN: string,
  password: string,
  groupDN: string
): Promise<any[]> {
  const client = getClient(config);
  try {
    await client.bind(userDN, password);

    // 1. Get the group's members (DNs)
    const { searchEntries: groupEntries } = await client.search(groupDN, {
      scope: 'base',
      attributes: ['member'],
    });

    if (groupEntries.length === 0) return [];

    const members = groupEntries[0].member;
    const memberDNs = Array.isArray(members) ? members : members ? [members] : [];

    if (memberDNs.length === 0) return [];

    // 2. Fetch details for each member
    // Since ldapts doesn't easily support OR filters for many DNs in one go efficiently without risk of long filters,
    // and we want type info, we can do a search with a filter for these DNs if they are in the same domain.
    // However, the most robust way is to fetch them.

    const results = await Promise.all(memberDNs.map(async (dn) => {
      try {
        const { searchEntries } = await client.search(String(dn), {
          scope: 'base',
          attributes: ['dn', 'cn', 'sAMAccountName', 'objectClass', 'displayName', 'mail'],
        });
        if (searchEntries.length > 0) {
          const entry = searchEntries[0];
          const objectClass = entry.objectClass as string[];
          let type = 'Unknown';
          if (objectClass.includes('user')) type = 'User';
          else if (objectClass.includes('group')) type = 'Group';
          else if (objectClass.includes('computer')) type = 'Computer';

          return {
            dn: entry.dn,
            cn: entry.cn,
            sAMAccountName: entry.sAMAccountName,
            displayName: entry.displayName,
            mail: entry.mail,
            type,
          };
        }
      } catch (e) {
        console.error(`Error fetching member ${dn}:`, e);
      }
      return null;
    }));

    return results.filter(Boolean);
  } finally {
    await client.unbind();
  }
}

export async function searchComputers(
  config: LDAPConfig,
  userDN: string,
  password: string,
  ouDN: string,
  scope: 'base' | 'one' | 'sub' = 'one'
): Promise<ADComputer[]> {
  const client = getClient(config);
  try {
    await client.bind(userDN, password);
    const { searchEntries } = await client.search(ouDN, {
      filter: '(objectClass=computer)',
      scope,
      attributes: [
        'dn',
        'objectClass',
        'cn',
        'sAMAccountName',
        'dNSHostName',
        'operatingSystem',
        'operatingSystemVersion',
        'userAccountControl',
        'whenCreated',
        'whenChanged',
      ],
    });

    return searchEntries.map((entry) => mapToADComputer(entry));
  } finally {
    await client.unbind();
  }
}

export async function searchGroups(
  config: LDAPConfig,
  userDN: string,
  password: string,
  ouDN: string,
  scope: 'base' | 'one' | 'sub' = 'one'
): Promise<ADGroup[]> {
  const client = getClient(config);
  try {
    await client.bind(userDN, password);
    const { searchEntries } = await client.search(ouDN, {
      filter: '(objectClass=group)',
      scope,
      attributes: [
        'dn',
        'objectClass',
        'cn',
        'sAMAccountName',
        'mail',
        'description',
        'member',
        'memberOf',
        'whenCreated',
        'whenChanged',
      ],
    });

    return searchEntries.map((entry) => mapToADGroup(entry));
  } finally {
    await client.unbind();
  }
}
