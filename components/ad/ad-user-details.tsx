'use client';

import { ADUser } from '@/lib/types/config';
import { getAccountStatus } from '@/lib/constants/ldap-attributes';

interface ADUserDetailsProps {
  user: ADUser;
  noContainer?: boolean;
}

function getInitials(name?: string) {
  return (name || '').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      {value
        ? <p className={`text-sm text-foreground break-all ${mono ? 'font-mono' : ''}`}>{value}</p>
        : <p className="text-sm text-muted-foreground/50">—</p>
      }
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground border-b border-border pb-1.5 mt-5 mb-3 first:mt-0">
      {children}
    </p>
  );
}

export function ADUserDetails({ user, noContainer = false }: ADUserDetailsProps) {
  const isActive = !((user.userAccountControl ?? 0) & 2);
  const managerCN = user.manager?.split(',')[0]?.replace(/^CN=/i, '') ?? null;

  return (
    <div className={noContainer ? "space-y-1" : "rounded-lg border border-border bg-card p-5 shadow-sm space-y-1"}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-medium text-blue-700 dark:text-blue-200 shrink-0">
            {getInitials(user.displayName || user.cn)}
          </div>
          <div>
            <h3 className="text-base font-medium">{user.displayName || user.cn}</h3>
            <p className="text-sm text-muted-foreground">{user.userPrincipalName}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
          isActive
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
          {isActive ? 'Active' : 'Disabled'}
        </span>
      </div>

      {/* Identity */}
      <SectionLabel>Identity</SectionLabel>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <Field label="Given name" value={user.givenName} />
        <Field label="Surname" value={user.sn} />
        <Field label="Username (SAM)" value={user.sAMAccountName} />
        <Field label="Email" value={user.mail} />
      </div>

      {/* Organization */}
      <SectionLabel>Organization</SectionLabel>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <Field label="Title" value={user.title} />
        <Field label="Department" value={user.department} />
        <Field label="Company" value={user.company} />
        <Field label="Manager" value={managerCN} />
      </div>

      {/* Contact */}
      <SectionLabel>Contact</SectionLabel>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <Field label="Phone" value={user.telephoneNumber} />
        <Field label="Mobile" value={user.mobile} />
        <Field label="Office" value={user.physicalDeliveryOfficeName} />
      </div>

      {/* Directory */}
      <SectionLabel>Directory</SectionLabel>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <Field label="Object class" value={user.objectClass?.join(', ')} />
        <Field label="Created" value={user.whenCreated} />
        <Field label="Modified" value={user.whenChanged} />
      </div>
      <div className="mt-3">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Distinguished name</p>
        <p className="text-xs font-mono bg-muted rounded-md px-3 py-2 break-all text-muted-foreground">{user.dn}</p>
      </div>

    </div>
  );
}