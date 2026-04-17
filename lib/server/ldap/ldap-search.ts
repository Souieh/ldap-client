import { ADComputer, ADGroup, ADUser, LDAPConfig } from '@/lib/types/config';
import { getClient, mapToADComputer, mapToADGroup, mapToADUser } from './ldap-helpers';

export async function searchUsers(
  config: LDAPConfig,
  userDN: string,
  password: string,
  ouDN: string,
  scope: 'base' | 'one' | 'sub' = 'one',
  query?: string
): Promise<ADUser[]> {
  const client = getClient(config);
  try {
    await client.bind(userDN, password);
    let filter = '(&(objectClass=person)(objectClass=user))';
    if (query) {
      const q = query.replace(/[()]/g, '');
      filter = `(&${filter}(|(cn=*${q}*)(sAMAccountName=*${q}*)(displayName=*${q}*)(mail=*${q}*)))`;
    }

    const { searchEntries } = await client.search(ouDN, {
      filter,
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

export async function getObjectParents(
  config: LDAPConfig,
  userDN: string,
  password: string,
  dn: string
): Promise<any[]> {
  const client = getClient(config);
  try {
    await client.bind(userDN, password);

    // 1. Get the object's parent groups (DNs) from memberOf attribute
    const { searchEntries } = await client.search(dn, {
      scope: 'base',
      attributes: ['memberOf'],
    });

    if (searchEntries.length === 0) return [];

    const memberOf = searchEntries[0].memberOf;
    const parentDNs = Array.isArray(memberOf) ? memberOf : memberOf ? [memberOf] : [];

    if (parentDNs.length === 0) return [];

    // 2. Fetch details for each parent group efficiently using chunked searches
    const chunkSize = 50;
    const allResults = [];

    for (let i = 0; i < parentDNs.length; i += chunkSize) {
      const chunk = parentDNs.slice(i, i + chunkSize);
      const filter = `(|${chunk.map((pdn) => `(distinguishedName=${pdn})`).join('')})`;

      try {
        const { searchEntries: resolvedEntries } = await client.search(config.baseDN, {
          filter,
          scope: 'sub',
          attributes: ['dn', 'cn', 'sAMAccountName', 'objectClass', 'displayName', 'mail'],
        });

        const chunkResults = resolvedEntries.map((entry) => {
          const objectClass = (entry.objectClass || []) as string[];
          let type = 'Group'; // In AD, memberOf typically points to groups
          if (objectClass.includes('user')) type = 'User';
          else if (objectClass.includes('computer')) type = 'Computer';

          return {
            dn: entry.dn,
            cn: entry.cn,
            sAMAccountName: entry.sAMAccountName,
            displayName: entry.displayName,
            mail: entry.mail,
            type,
          };
        });
        allResults.push(...chunkResults);
      } catch (e) {
        console.error(`Error fetching parent group chunk:`, e);
      }
    }

    return allResults;
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

    // 2. Fetch details for each member efficiently
    // We can use a search on the baseDN with an OR filter of distinguishedName
    // To avoid too large filters, we can chunk the requests if needed (e.g. 50 at a time)
    const chunkSize = 50;
    const allResults = [];

    for (let i = 0; i < memberDNs.length; i += chunkSize) {
      const chunk = memberDNs.slice(i, i + chunkSize);
      const filter = `(|${chunk.map((dn) => `(distinguishedName=${dn})`).join('')})`;

      try {
        const { searchEntries } = await client.search(config.baseDN, {
          filter,
          scope: 'sub',
          attributes: ['dn', 'cn', 'sAMAccountName', 'objectClass', 'displayName', 'mail'],
        });

        const chunkResults = searchEntries.map((entry) => {
          const objectClass = (entry.objectClass || []) as string[];
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
        });
        allResults.push(...chunkResults);
      } catch (e) {
        console.error(`Error fetching member chunk:`, e);
      }
    }

    return allResults;
  } finally {
    await client.unbind();
  }
}

export async function searchComputers(
  config: LDAPConfig,
  userDN: string,
  password: string,
  ouDN: string,
  scope: 'base' | 'one' | 'sub' = 'one',
  query?: string
): Promise<ADComputer[]> {
  const client = getClient(config);
  try {
    await client.bind(userDN, password);
    let filter = '(objectClass=computer)';
    if (query) {
      const q = query.replace(/[()]/g, '');
      filter = `(&${filter}(|(cn=*${q}*)(sAMAccountName=*${q}*)(dNSHostName=*${q}*)))`;
    }

    const { searchEntries } = await client.search(ouDN, {
      filter,
      scope,
      attributes: [
        'dn',
        'objectClass',
        'cn',
        'displayName',
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
  scope: 'base' | 'one' | 'sub' = 'one',
  query?: string
): Promise<ADGroup[]> {
  const client = getClient(config);
  try {
    await client.bind(userDN, password);
    let filter = '(objectClass=group)';
    if (query) {
      const q = query.replace(/[()]/g, '');
      filter = `(&${filter}(|(cn=*${q}*)(sAMAccountName=*${q}*)(displayName=*${q}*)(mail=*${q}*)))`;
    }

    const { searchEntries } = await client.search(ouDN, {
      filter,
      scope,
      attributes: [
        'dn',
        'objectClass',
        'cn',
        'displayName',
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
