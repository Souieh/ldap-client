import { ADComputer, ADGroup, ADOU, ADUser, LDAPConfig } from '@/lib/types/config';
import { Client, Entry } from 'ldapts';

export function getClient(config: LDAPConfig): Client {
  const url = `${config.protocol}://${config.hostname}:${config.port}`;

  return new Client({
    url,
    timeout: 10000,
    connectTimeout: 10000,
    // If using LDAPS and a CA certificate is provided, configure TLS options
    ...(config.protocol === 'ldaps' && config.ca
      ? {
          tlsOptions: {
            ca: config.ca ? [config.ca] : undefined,
            rejectUnauthorized: !config.disableTlsVerification,
          },
        }
      : {}),
  });
}

export function escapeFilterValue(value: string): string {
  return value
    .replace(/[\\]/g, '\\5c')
    .replace(/[*]/g, '\\2a')
    .replace(/[(]/g, '\\28')
    .replace(/[)]/g, '\\29')
    .replace(/[\0]/g, '\\00');
}

export function escapeDNValue(value: string): string {
  return value.replace(/[,\\#+<>;\"=]/g, '').trim();
}

export function getFriendlyErrorMessage(error: any): string {
  const message = error.message || String(error);

  // Active Directory specific error codes in the 'data' field
  if (message.includes('data 525')) return 'User not found';
  if (message.includes('data 52e')) return 'Invalid credentials (username or password incorrect)';
  if (message.includes('data 530')) return 'Not permitted to log on at this time';
  if (message.includes('data 531')) return 'Not permitted to log on at this workstation';
  if (message.includes('data 532')) return 'Password expired';
  if (message.includes('data 533')) return 'Account disabled';
  if (message.includes('data 701')) return 'Account expired';
  if (message.includes('data 773')) return 'User must change password';
  if (message.includes('data 775')) return 'User account locked';

  if (message.includes('Invalid Credentials') || message.includes('code 49')) {
    return 'Invalid LDAP credentials';
  }

  if (message.includes('ECONNREFUSED')) {
    return 'Could not connect to LDAP server (Connection refused)';
  }

  if (message.includes('ETIMEDOUT')) {
    return 'Connection to LDAP server timed out';
  }

  return message;
}

export function getEntryValue(entry: Entry, key: string): string | string[] | undefined {
  const value = entry[key];

  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }

  if (Array.isArray(value)) {
    return value.map((item) => (Buffer.isBuffer(item) ? item.toString('utf8') : String(item)));
  }

  return value as string | undefined;
}

export function mapToADOU(entry: Entry): ADOU {
  const objectClass = getEntryValue(entry, 'objectClass');

  return {
    dn: entry.dn,
    objectClass: Array.isArray(objectClass)
      ? (objectClass as string[])
      : objectClass
        ? [objectClass]
        : [],
    ou: String(getEntryValue(entry, 'ou') || ''),
    cn: String(getEntryValue(entry, 'cn') || ''),
    description: String(getEntryValue(entry, 'description') || ''),
    whenCreated: String(getEntryValue(entry, 'whenCreated') || ''),
    whenChanged: String(getEntryValue(entry, 'whenChanged') || ''),
  };
}

export function mapToADUser(entry: Entry): ADUser {
  const objectClass = getEntryValue(entry, 'objectClass');

  return {
    dn: entry.dn,
    objectClass: Array.isArray(objectClass)
      ? (objectClass as string[])
      : objectClass
        ? [objectClass]
        : [],
    cn: String(getEntryValue(entry, 'cn') || ''),
    sAMAccountName: String(getEntryValue(entry, 'sAMAccountName') || ''),
    mail: String(getEntryValue(entry, 'mail') || ''),
    displayName: String(getEntryValue(entry, 'displayName') || ''),
    telephoneNumber: String(getEntryValue(entry, 'telephoneNumber') || ''),
    title: String(getEntryValue(entry, 'title') || ''),
    department: String(getEntryValue(entry, 'department') || ''),
    userAccountControl: getEntryValue(entry, 'userAccountControl')
      ? parseInt(String(getEntryValue(entry, 'userAccountControl')))
      : undefined,
    lastLogonTimestamp: String(getEntryValue(entry, 'lastLogonTimestamp') || ''),
    whenCreated: String(getEntryValue(entry, 'whenCreated') || ''),
    whenChanged: String(getEntryValue(entry, 'whenChanged') || ''),
  };
}

export function mapToADComputer(entry: Entry): ADComputer {
  const objectClass = getEntryValue(entry, 'objectClass');

  return {
    dn: entry.dn,
    objectClass: Array.isArray(objectClass)
      ? (objectClass as string[])
      : objectClass
        ? [objectClass]
        : [],
    cn: String(getEntryValue(entry, 'cn') || ''),
    sAMAccountName: String(getEntryValue(entry, 'sAMAccountName') || ''),
    dNSHostName: String(getEntryValue(entry, 'dNSHostName') || ''),
    operatingSystem: String(getEntryValue(entry, 'operatingSystem') || ''),
    operatingSystemVersion: String(getEntryValue(entry, 'operatingSystemVersion') || ''),
    userAccountControl: getEntryValue(entry, 'userAccountControl')
      ? parseInt(String(getEntryValue(entry, 'userAccountControl')))
      : undefined,
    whenCreated: String(getEntryValue(entry, 'whenCreated') || ''),
    whenChanged: String(getEntryValue(entry, 'whenChanged') || ''),
  };
}

export function mapToADGroup(entry: Entry): ADGroup {
  const objectClass = getEntryValue(entry, 'objectClass');
  const member = getEntryValue(entry, 'member');
  const memberOf = getEntryValue(entry, 'memberOf');

  return {
    dn: entry.dn,
    objectClass: Array.isArray(objectClass)
      ? (objectClass as string[])
      : objectClass
        ? [objectClass]
        : [],
    cn: String(getEntryValue(entry, 'cn') || ''),
    sAMAccountName: String(getEntryValue(entry, 'sAMAccountName') || ''),
    mail: String(getEntryValue(entry, 'mail') || ''),
    description: String(getEntryValue(entry, 'description') || ''),
    member: Array.isArray(member) ? (member as string[]) : member ? [String(member)] : [],
    memberOf: Array.isArray(memberOf) ? (memberOf as string[]) : memberOf ? [String(memberOf)] : [],
    whenCreated: String(getEntryValue(entry, 'whenCreated') || ''),
    whenChanged: String(getEntryValue(entry, 'whenChanged') || ''),
  };
}
