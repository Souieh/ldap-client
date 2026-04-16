'use client';

import { ADGroup } from '@/lib/types/config';

interface ADGroupDetailsProps {
  group: ADGroup;
  noContainer?: boolean;
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

function StatPill({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/40 px-4 py-3 gap-0.5">
      <span className="text-lg font-medium text-foreground">{count}</span>
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}

const GROUP_TYPE_MAP: Record<string, { label: string; variant: string }> = {
  '-2147483646': { label: 'Global security',           variant: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  '-2147483644': { label: 'Domain local security',     variant: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  '-2147483640': { label: 'Universal security',        variant: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
  '2':           { label: 'Global distribution',       variant: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  '4':           { label: 'Domain local distribution', variant: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  '8':           { label: 'Universal distribution',    variant: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200' },
};

function getInitials(name: string) {
  return name.split(/[\s_-]+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'G';
}

export function ADGroupDetails({ group, noContainer = false }: ADGroupDetailsProps) {
  const groupType = GROUP_TYPE_MAP[String(group.groupType)] ?? null;
  const managerCN = group.managedBy?.split(',')[0]?.replace(/^CN=/i, '') ?? null;

  return (
    <div className={noContainer ? "space-y-1" : "rounded-lg border border-border bg-card p-5 shadow-sm space-y-1"}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-sm font-medium text-purple-700 dark:text-purple-200 shrink-0">
            {getInitials(group.cn)}
          </div>
          <div>
            <h3 className="text-base font-medium">{group.displayName || group.cn}</h3>
            <p className="text-sm text-muted-foreground">{group.sAMAccountName}</p>
          </div>
        </div>
        {groupType && (
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${groupType.variant}`}>
            {groupType.label}
          </span>
        )}
      </div>

      {/* Membership stats */}
      <div className="grid grid-cols-2 gap-3 mb-2">
        <StatPill label="Members" count={group.member?.length ?? 0} />
        <StatPill label="Member of" count={group.memberOf?.length ?? 0} />
      </div>

      {/* General */}
      <SectionLabel>General</SectionLabel>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <Field label="Email" value={group.mail} />
        <Field label="Managed by" value={managerCN} />
        <Field label="Description" value={group.description} />
        <Field label="Notes" value={group.info} />
      </div>

      {/* Directory */}
      <SectionLabel>Directory</SectionLabel>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <Field label="Object class" value={group.objectClass?.join(', ')} />
        <Field label="Created" value={group.whenCreated} />
        <Field label="Modified" value={group.whenChanged} />
      </div>
      <div className="mt-3">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Distinguished name</p>
        <p className="text-xs font-mono bg-muted rounded-md px-3 py-2 break-all text-muted-foreground">{group.dn}</p>
      </div>

    </div>
  );
}