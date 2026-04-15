'use client';

import { Info, Loader2, Shield, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Input } from '../ui/input';

interface ACE {
  sid: string;
  name?: string;
  type: 'ALLOW' | 'DENY';
  rights: string[];
  inherited: boolean;
  appliesTo: string;
}

interface ObjectPermissionsProps {
  dn: string;
  hideCard?: boolean;
}

const includes = (obj: { [key: string]: any }, key: string, value: string) =>
  obj[key]?.toLowerCase().includes(value.toLowerCase());

export function ObjectPermissions({ dn, hideCard = false }: ObjectPermissionsProps) {
  const [permissions, setPermissions] = useState<ACE[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchKey, setSearchKey] = useState('');
  useEffect(() => {
    if (dn) {
      loadPermissions();
    }
  }, [dn]);

  const loadPermissions = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/ldap/objects/permissions?dn=${encodeURIComponent(dn)}`);
      if (!res.ok) throw new Error('Failed to load permissions');
      const data = await res.json();
      setPermissions(data);
    } catch (error) {
      console.error(error);
      toast.error('Error loading permissions');
    } finally {
      setIsLoading(false);
    }
  };
  const filtredPermissions = useMemo(
    () =>
      searchKey?.length > 0
        ? permissions.filter((p) =>
            (Object.keys(p) as Array<keyof ACE>)
              .map((k) => {
                const val = p[k];
                return (typeof val === 'string' ? val.toLowerCase() : '').includes(
                  searchKey?.toLowerCase()
                );
              })
              .some((s) => s)
          )
        : permissions,
    [searchKey, permissions]
  );

  if (isLoading) {
    return (
      <div className='flex flex-col items-center justify-center p-12 text-center text-muted-foreground'>
        <Loader2 className='h-8 w-8 animate-spin mb-2' />
        <p className='text-sm italic'>Retrieving ACLs...</p>
      </div>
    );
  }

  const content = (
    <div className='p-0'>
      <div className='p-4 border-b bg-muted/5'>
        <div className='relative'>
          <Input
            placeholder='Filter permissions by principal, SID, or right...'
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
            className='h-9 text-sm'
          />
        </div>
      </div>

      {filtredPermissions.length > 0 ? (
        <div className='divide-y max-h-[500px] overflow-y-auto'>
          {filtredPermissions.map((ace, idx) => (
            <div
              key={`${ace.sid}-${idx}`}
              className='px-6 py-4 hover:bg-muted/50 transition-colors'
            >
              <div className='flex items-start justify-between gap-4'>
                <div className='min-w-0'>
                  <div className='flex items-center gap-2 mb-1'>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        ace.type === 'ALLOW'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {ace.type}
                    </span>
                    <p className='text-sm font-semibold truncate'>
                      {ace.name || 'Unknown Principal'}
                    </p>
                  </div>
                  <p className='text-[10px] text-muted-foreground font-mono truncate mb-2'>
                    {ace.sid}
                  </p>
                  <div className='flex flex-wrap gap-1'>
                    {ace.rights.map((right, rIdx) => (
                      <span
                        key={rIdx}
                        className='text-[9px] bg-muted px-1.5 py-0.5 rounded border text-muted-foreground'
                      >
                        {right}
                      </span>
                    ))}
                  </div>
                </div>
                <div className='flex flex-col items-end shrink-0 gap-1'>
                  {ace.inherited && (
                    <span className='text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1'>
                      <ShieldCheck className='h-3 w-3' />
                      Inherited
                    </span>
                  )}
                  <span className='text-[9px] text-muted-foreground italic'>{ace.appliesTo}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className='p-12 text-center space-y-4'>
          <div className='w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto'>
            <Info className='h-6 w-6 text-muted-foreground' />
          </div>
          <div className='max-w-xs mx-auto'>
            <p className='text-sm font-medium text-foreground'>Advanced Security Management</p>
            <p className='text-xs text-muted-foreground mt-1'>
              Permissions management for AD objects is currently being implemented. You can view
              basic directory information above.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  if (hideCard) return content;

  return (
    <div className='bg-card border rounded-xl shadow-sm overflow-hidden'>
      <div className='px-6 py-4 border-b flex items-center justify-between'>
        <h3 className='font-semibold flex items-center gap-2'>
          <Shield className='h-4 w-4 text-primary' />
          Attribute-Level Permissions (ACLs)
        </h3>
      </div>
      {content}
    </div>
  );
}
