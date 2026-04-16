'use client';

import { ADComputer } from '@/lib/types/config';

interface ADComputerDetailsProps {
  computer: ADComputer;
  noContainer?: boolean;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value || '-'}</p>
    </div>
  );
}

export function ADComputerDetails({ computer, noContainer = false }: ADComputerDetailsProps) {
  return (
    <div className="space-y-6">
      <div className={noContainer ? "space-y-4" : "rounded-lg border border-border bg-card p-5 shadow-sm"}>
        <div className="mb-4">
          <h3 className="text-xl font-semibold">Computer details</h3>
          <p className="text-sm text-muted-foreground">Hardware and account information for the selected machine.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DetailRow label="Name" value={computer.cn} />
          <DetailRow label="Account" value={computer.sAMAccountName} />
          <DetailRow label="DNS name" value={computer.dNSHostName || ''} />
          <DetailRow label="Operating system" value={computer.operatingSystem || ''} />
          <DetailRow label="OS version" value={computer.operatingSystemVersion || ''} />
          <DetailRow label="Created" value={computer.whenCreated || ''} />
          <DetailRow label="Modified" value={computer.whenChanged || ''} />
          <DetailRow label="Object class" value={computer.objectClass?.join(', ') || ''} />
          <DetailRow label="Distinguished name" value={computer.dn} />
        </div>
      </div>
    </div>
  );
}
