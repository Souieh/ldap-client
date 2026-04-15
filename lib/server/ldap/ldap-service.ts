import { ADComputer, ADGroup, ADOU, ADUser, DNSRecord, LDAPConfig } from '@/lib/types/config';
import { bindWithPassword } from './ldap-auth';
import { createDnsRecord, deleteDnsRecord, getDnsRecords, updateDnsRecord } from './ldap-dns';
import {
  createObject,
  deleteObject,
  moveObject,
  toggleGroupMember,
  toggleObjectStatus,
  updateObject,
  updatePassword,
} from './ldap-objects';
import { createOU, deleteOU, searchOUs } from './ldap-ous';
import { getObjectPermissions } from './ldap-permissions';
import {
  getGroupMembers,
  getObjectByDN,
  getObjectParents,
  searchComputers,
  searchGroups,
  searchUsers,
} from './ldap-search';

export class LDAPService {
  async createObject(
    ouDN: string,
    objectType: string,
    attributes: any,
    userDN: string,
    password: string
  ) {
    return createObject(ouDN, objectType, attributes, userDN, password);
  }

  async moveObject(dn: string, newOU: string, userDN: string, password: string) {
    return moveObject(dn, newOU, userDN, password);
  }

  async updateObject(dn: string, attributes: any, userDN: string, password: string) {
    return updateObject(dn, attributes, userDN, password);
  }
  async updatePassword(dn: string, newPassword: string, userDN: string, password: string) {
    return updatePassword(dn, newPassword, userDN, password);
  }

  async toggleObjectStatus(dn: string, enabled: boolean, userDN: string, password: string) {
    return toggleObjectStatus(dn, enabled, userDN, password);
  }

  async toggleGroupMember(
    groupDN: string,
    memberDN: string,
    action: 'add' | 'delete',
    userDN: string,
    password: string
  ) {
    return toggleGroupMember(groupDN, memberDN, action, userDN, password);
  }

  async deleteObject(dn: string, userDN: string, password: string) {
    return deleteObject(dn, userDN, password);
  }

  async disconnect(): Promise<void> {
    // This is now a no-op as methods handle their own connections
  }

  async bindWithPassword(
    config: LDAPConfig,
    username: string,
    password: string
  ): Promise<{ success: boolean; dn?: string; upn?: string; error?: string }> {
    return bindWithPassword(config, username, password);
  }

  async searchOUs(config: LDAPConfig, userDN: string, password: string): Promise<ADOU[]> {
    return searchOUs(config, userDN, password);
  }

  async createOU(
    config: LDAPConfig,
    userDN: string,
    password: string,
    parentDN: string | undefined,
    ouName: string
  ): Promise<ADOU> {
    return createOU(config, userDN, password, parentDN, ouName);
  }

  async deleteOU(
    config: LDAPConfig,
    userDN: string,
    password: string,
    ouDN: string
  ): Promise<void> {
    return deleteOU(config, userDN, password, ouDN);
  }

  async searchUsers(
    config: LDAPConfig,
    userDN: string,
    password: string,
    ouDN: string,
    scope: 'base' | 'one' | 'sub' = 'one'
  ): Promise<ADUser[]> {
    return searchUsers(config, userDN, password, ouDN, scope);
  }

  async searchComputers(
    config: LDAPConfig,
    userDN: string,
    password: string,
    ouDN: string,
    scope: 'base' | 'one' | 'sub' = 'one'
  ): Promise<ADComputer[]> {
    return searchComputers(config, userDN, password, ouDN, scope);
  }

  async searchGroups(
    config: LDAPConfig,
    userDN: string,
    password: string,
    ouDN: string,
    scope: 'base' | 'one' | 'sub' = 'one'
  ): Promise<ADGroup[]> {
    return searchGroups(config, userDN, password, ouDN, scope);
  }

  async getGroupMembers(
    config: LDAPConfig,
    userDN: string,
    password: string,
    objectDN: string
  ): Promise<any[]> {
    return getGroupMembers(config, userDN, password, objectDN);
  }

  async getObjectParents(
    config: LDAPConfig,
    userDN: string,
    password: string,
    groupDN: string
  ): Promise<any[]> {
    return getObjectParents(config, userDN, password, groupDN);
  }

  async getObjectByDN(
    config: LDAPConfig,
    userDN: string,
    password: string,
    dn: string
  ): Promise<any> {
    return getObjectByDN(config, userDN, password, dn);
  }

  async getObjectPermissions(config: LDAPConfig, userDN: string, password: string, dn: string) {
    return getObjectPermissions(config, userDN, password, dn);
  }

  async getDashboardStats(
    config: LDAPConfig,
    userDN: string,
    password: string
  ): Promise<{ users: number; groups: number; computers: number }> {
    const [users, groups, computers] = await Promise.all([
      this.searchUsers(config, userDN, password, config.baseDN || '', 'sub'),
      this.searchGroups(config, userDN, password, config.baseDN || '', 'sub'),
      this.searchComputers(config, userDN, password, config.baseDN || '', 'sub'),
    ]);

    return {
      users: users.length,
      groups: groups.length,
      computers: computers.length,
    };
  }

  async getDnsRecords(config: LDAPConfig, userDN: string, password: string): Promise<DNSRecord[]> {
    return getDnsRecords(config, userDN, password);
  }

  async createDnsRecord(
    config: LDAPConfig,
    record: Partial<DNSRecord>,
    userDN: string,
    password: string
  ) {
    return createDnsRecord(config, record, userDN, password);
  }

  async updateDnsRecord(
    config: LDAPConfig,
    dn: string,
    record: Partial<DNSRecord>,
    userDN: string,
    password: string
  ) {
    return updateDnsRecord(config, dn, record, userDN, password);
  }

  async deleteDnsRecord(config: LDAPConfig, dn: string, userDN: string, password: string) {
    return deleteDnsRecord(config, dn, userDN, password);
  }
}

export const ldapService = new LDAPService();
