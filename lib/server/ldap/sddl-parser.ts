export interface ACE {
  type: 'ALLOW' | 'DENY' | 'OTHER';
  flags: number;
  mask: number;
  sid: string;
  inherited: boolean;
}

export interface SecurityDescriptor {
  revision: number;
  control: number;
  ownerSid?: string;
  groupSid?: string;
  dacl?: ACE[];
}

export function sidToString(input: Buffer | Uint8Array): string {
  if (!input) return '';
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (buffer.length < 8) return '';

  const revision = buffer.readUInt8(0);
  const subAuthorityCount = buffer.readUInt8(1);
  const identifierAuthority = buffer.readUIntBE(2, 6);

  // Per spec: if authority >= 2^32, format as hex; otherwise decimal
  const authorityStr =
    identifierAuthority >= 0x100000000
      ? `0x${identifierAuthority.toString(16).toUpperCase()}`
      : String(identifierAuthority);

  let sid = `S-${revision}-${authorityStr}`;
  for (let i = 0; i < subAuthorityCount; i++) {
    if (8 + i * 4 + 4 > buffer.length) break; // guard truncated buffer
    const subAuthority = buffer.readUInt32LE(8 + i * 4);
    sid += `-${subAuthority}`;
  }
  return sid;
}

/**
 * Convert an S-1-5-... string back to a binary Buffer.
 * Used for constructing LDAP objectSid search filters.
 */
export function sidToBuffer(sidString: string): Buffer {
  const parts = sidString.split('-').slice(1); // drop leading 'S'
  const revision = parseInt(parts[0], 10);
  const authority = parseInt(parts[1], 10);
  const subAuthorities = parts.slice(2).map((p) => parseInt(p, 10));

  const buf = Buffer.alloc(8 + subAuthorities.length * 4);
  buf.writeUInt8(revision, 0);
  buf.writeUInt8(subAuthorities.length, 1);
  buf.writeUIntBE(authority, 2, 6);
  subAuthorities.forEach((sa, i) => buf.writeUInt32LE(sa, 8 + i * 4));
  return buf;
}

/**
 * Encode a SID string as an LDAP escaped-octet-string for use in filters.
 * e.g. S-1-5-21-... → \01\05\00\00...
 */
export function sidToLdapFilter(sidString: string): string {
  const buf = sidToBuffer(sidString);
  return buf.reduce((s, b) => s + `\\${b.toString(16).padStart(2, '0')}`, '');
}

export function parseSecurityDescriptor(input: Buffer | Uint8Array): SecurityDescriptor {
  if (!input) throw new Error('Invalid Security Descriptor buffer');
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);

  if (buffer.length < 20) {
    throw new Error(`Security Descriptor too short: ${buffer.length} bytes`);
  }

  const revision = buffer.readUInt8(0);
  // byte 1 = Sbz1, skip
  const control = buffer.readUInt16LE(2);
  const ownerOffset = buffer.readUInt32LE(4);
  const groupOffset = buffer.readUInt32LE(8);
  // bytes 12-15 = SACL offset, skip
  const daclOffset = buffer.readUInt32LE(16);

  const ownerSid =
    ownerOffset >= 20 && ownerOffset < buffer.length
      ? sidToString(buffer.subarray(ownerOffset))
      : undefined;

  const groupSid =
    groupOffset >= 20 && groupOffset < buffer.length
      ? sidToString(buffer.subarray(groupOffset))
      : undefined;

  const dacl =
    daclOffset >= 20 && daclOffset < buffer.length
      ? parseAcl(buffer.subarray(daclOffset))
      : undefined;

  return { revision, control, ownerSid, groupSid, dacl };
}

function parseAcl(buffer: Buffer): ACE[] {
  if (buffer.length < 8) return [];

  // byte 0 = ACL revision, byte 1 = Sbz1
  // bytes 2-3 = ACL size, bytes 4-5 = ACE count, bytes 6-7 = Sbz2
  const aceCount = buffer.readUInt16LE(4);
  const aces: ACE[] = [];
  let offset = 8;

  for (let i = 0; i < aceCount; i++) {
    if (offset + 8 > buffer.length) break; // need at least header + mask

    const aceType = buffer.readUInt8(offset);
    const aceFlags = buffer.readUInt8(offset + 1);
    const aceSize = buffer.readUInt16LE(offset + 2);

    if (aceSize < 8 || offset + aceSize > buffer.length) break;

    const mask = buffer.readUInt32LE(offset + 4);
    const sid = sidToString(buffer.subarray(offset + 8));

    let type: ACE['type'] = 'OTHER';
    if (aceType === 0x00) type = 'ALLOW';
    else if (aceType === 0x01) type = 'DENY';

    aces.push({
      type,
      flags: aceFlags,
      mask,
      sid,
      inherited: (aceFlags & 0x10) !== 0, // INHERITED_ACE
    });

    offset += aceSize;
  }
  return aces;
}

export function getRightsFromMask(mask: number): string[] {
  const rights: string[] = [];

  // Generic rights
  if (mask & 0x80000000) rights.push('Generic Read');
  if (mask & 0x40000000) rights.push('Generic Write');
  if (mask & 0x20000000) rights.push('Generic Execute');
  if (mask & 0x10000000) rights.push('Generic All');

  // Standard rights (correct bit positions per Windows SDK)
  if (mask & 0x00080000) rights.push('Take Ownership'); // WRITE_OWNER
  if (mask & 0x00040000) rights.push('Change Permissions'); // WRITE_DAC
  if (mask & 0x00020000) rights.push('Read Permissions'); // READ_CONTROL
  if (mask & 0x00010000) rights.push('Delete'); // DELETE

  // DS-specific object access rights
  if (mask & 0x00000100) rights.push('Extended Right');
  if (mask & 0x00000080) rights.push('List Object');
  if (mask & 0x00000040) rights.push('Delete Tree');
  if (mask & 0x00000020) rights.push('Write Property');
  if (mask & 0x00000010) rights.push('Read Property');
  if (mask & 0x00000008) rights.push('Self Write');
  if (mask & 0x00000004) rights.push('List Children');
  if (mask & 0x00000002) rights.push('Delete Child');
  if (mask & 0x00000001) rights.push('Create Child');

  return rights.length > 0 ? rights : [`Unknown (0x${mask.toString(16).padStart(8, '0')})`];
}

/**
 * Returns a human-readable "Applies To" string from ACE flags.
 *
 * Flags:
 *   0x01  OBJECT_INHERIT_ACE      (OI) — propagates to child leaf objects
 *   0x02  CONTAINER_INHERIT_ACE   (CI) — propagates to child containers
 *   0x04  NO_PROPAGATE_INHERIT_ACE(NP) — do not propagate further
 *   0x08  INHERIT_ONLY_ACE        (IO) — does NOT apply to this object
 *   0x10  INHERITED_ACE               — this ACE was inherited
 */
export function getAppliesToFromFlags(flags: number): string {
  const OI = !!(flags & 0x01);
  const CI = !!(flags & 0x02);
  const IO = !!(flags & 0x08); // inherit-only = does NOT apply to this object

  if (!OI && !CI) return 'This object only';
  if (OI && CI && !IO) return 'This object and all child objects';
  if (CI && !OI && !IO) return 'This object and child containers';
  if (OI && !CI && !IO) return 'This object and child leaf objects';
  if (IO && OI && CI) return 'All child objects';
  if (IO && CI) return 'Child containers only';
  if (IO && OI) return 'Child leaf objects only';
  return 'This object only';
}
