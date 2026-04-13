import { LDAPConfig } from '@/lib/types/config';
import { Client } from 'ldapts';
import { getClient, getFriendlyErrorMessage } from './ldap-helpers';

export async function bindWithPassword(
  config: LDAPConfig,
  username: string,
  password: string
): Promise<{ success: boolean; dn?: string; upn?: string; error?: string }> {
  const client: Client = getClient(config);

  try {
    if (!password || password.trim() === '' || !username || username.trim() === '') {
      return { success: false, error: 'Empty password or username is not allowed' };
    }

    // This call is sufficient. If the password is wrong,
    // it WILL throw the "data 52e" error.
    const upn = (username.includes('@') ? username : `${username}@${config.domain}`).toLowerCase();
    const netbiosName = config.domain.split('.')[0].toUpperCase();
    const loginString = `${netbiosName}\\${username}`;
    await client.bind(upn, password);

    const { searchEntries } = await client.search(config.baseDN, {
      filter: `(sAMAccountName=${username})`,
      scope: 'sub', // Changed from 'base' to 'sub'
      attributes: ['dn', 'cn', 'memberOf'], // Grab the DN and their groups while you're at it
    });

    return { success: true, dn: searchEntries[0]?.dn, upn };
  } catch (error: any) {
    console.error('LDAP bind error:', error);
    return { success: false, error: getFriendlyErrorMessage(error) };
  } finally {
    // CRITICAL: Ensure we unbind to close the socket
    await client.unbind();
  }
}
