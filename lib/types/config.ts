export interface LDAPConfig {
  id: string;
  name: string;
  hostname: string;
  port: number;
  protocol: 'ldap' | 'ldaps';
  domain: string;
  baseDN: string;
  created: string;
  modified: string;
  disableTlsVerification: boolean;
  ca?: string; // PEM-encoded CA certificate for LDAPS
}

export interface ConfigProfile {
  id: string;
  name: string;
  isActive: boolean;
  config: LDAPConfig;
}

export interface ADObject {
  dn: string;
  objectClass: string[];
  cn: string;
  [key: string]: any;
}

export interface ADUser extends ADObject {
  sAMAccountName: string;
  mail?: string;
  displayName?: string;
  telephoneNumber?: string;
  title?: string;
  department?: string;
  userAccountControl?: number;
  lastLogonTimestamp?: string;
  whenCreated?: string;
  whenChanged?: string;
}

export interface ADComputer extends ADObject {
  sAMAccountName: string;
  dNSHostName?: string;
  operatingSystem?: string;
  operatingSystemVersion?: string;
  userAccountControl?: number;
  whenCreated?: string;
  whenChanged?: string;
}

export interface ADGroup extends ADObject {
  sAMAccountName: string;
  mail?: string;
  description?: string;
  member?: string[];
  memberOf?: string[];
  whenCreated?: string;
  whenChanged?: string;
}

export interface ADOU extends ADObject {
  ou: string;
  description?: string;
  whenCreated?: string;
  whenChanged?: string;
}

export type DNSRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'PTR' | 'SOA' | 'TXT' | 'SRV';

export interface DNSRecord {
  id: string;
  zone: string;
  name: string;
  type: DNSRecordType;
  data: string;
  ttl?: number;
  priority?: number;
  created?: string;
  modified?: string;
}
