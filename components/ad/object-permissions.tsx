'use client';

import { Info, Loader2, Shield, ShieldCheck, Plus, Trash2, Edit2, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Modal } from '../ui/modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

interface ACE {
  sid: string;
  name?: string;
  type: 'ALLOW' | 'DENY';
  rights: string[];
  inherited: boolean;
  appliesTo: string;
}

interface ObjectPermissionsProps {
  objectDN: string;
  hideCard?: boolean;
}

const ALL_RIGHTS = [
  'Generic All', 'Generic Read', 'Generic Write', 'Generic Execute',
  'Read Property', 'Write Property', 'Create Child', 'Delete Child',
  'List Children', 'Self Write', 'Delete Tree', 'List Object',
  'Extended Right', 'Delete', 'Read Permissions', 'Change Permissions', 'Take Ownership'
];

export function ObjectPermissions({ objectDN }: ObjectPermissionsProps) {
  const [permissions, setPermissions] = useState<ACE[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchKey, setSearchKey] = useState('');

  // ACE Management State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAce, setEditingAce] = useState<ACE | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (objectDN) {
      loadPermissions();
    }
  }, [objectDN]);

  const loadPermissions = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/ldap/objects/permissions?dn=${encodeURIComponent(objectDN)}`);
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

  const handleTogglePermission = async (ace: ACE, action: 'add' | 'delete') => {
    // This is a placeholder as the backend currently doesn't have an endpoint for updating specific ACEs
    // In a real AD manager, you'd send the updated DACL or a delta.
    toast.info('Permissions management logic is still in development on the server side.');
  };

  const filteredPermissions = useMemo(
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

  return (
    <div className='flex flex-col h-full'>
      <div className='p-4 border-b bg-muted/5 flex items-center justify-between gap-4'>
        <div className='relative flex-1'>
          <Input
            placeholder='Filter permissions...'
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
            className='h-9 text-sm'
          />
        </div>
        <Button size='sm' className='gap-2' onClick={() => setIsModalOpen(true)}>
          <Plus className='h-4 w-4' />
          Add ACE
        </Button>
      </div>

      <div className='divide-y flex-1'>
        {filteredPermissions.length > 0 ? (
          filteredPermissions.map((ace, idx) => (
            <div
              key={`${ace.sid}-${idx}`}
              className='px-6 py-4 hover:bg-muted/50 transition-colors group'
            >
              <div className='flex items-start justify-between gap-4'>
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2 mb-1'>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        ace.type === 'ALLOW'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
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
                <div className='flex flex-col items-end shrink-0 gap-2'>
                  <div className='flex items-center gap-1'>
                    {ace.inherited && (
                      <span className='text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1 dark:bg-blue-900/20 dark:border-blue-900/30 dark:text-blue-400'>
                        <ShieldCheck className='h-3 w-3' />
                        Inherited
                      </span>
                    )}
                    <span className='text-[9px] text-muted-foreground italic'>{ace.appliesTo}</span>
                  </div>
                  {!ace.inherited && (
                    <div className='flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                      <Button variant='ghost' size='icon' className='h-7 w-7' onClick={() => { setEditingAce(ace); setIsModalOpen(true); }}>
                        <Edit2 className='h-3.5 w-3.5' />
                      </Button>
                      <Button variant='ghost' size='icon' className='h-7 w-7 text-destructive' onClick={() => handleTogglePermission(ace, 'delete')}>
                        <Trash2 className='h-3.5 w-3.5' />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className='p-12 text-center space-y-4'>
            <div className='w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto'>
              <Shield className='h-6 w-6 text-muted-foreground' />
            </div>
            <p className='text-sm text-muted-foreground'>No matching permissions found.</p>
          </div>
        )}
      </div>

      {/* Add/Edit ACE Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingAce(null); }}
        title={editingAce ? 'Edit Permission' : 'Add Permission Entry'}
        description='Configure access control for this Active Directory object.'
        size='2xl'
      >
        <div className='space-y-6 py-2'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label>Principal (SID or Name)</Label>
              <Input placeholder='S-1-5-...' defaultValue={editingAce?.sid} />
            </div>
            <div className='space-y-2'>
              <Label>Type</Label>
              <Select defaultValue={editingAce?.type || 'ALLOW'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALLOW'>Allow</SelectItem>
                  <SelectItem value='DENY'>Deny</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='space-y-3'>
            <Label className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>Permissions</Label>
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-3 border rounded-lg p-4 bg-muted/20'>
              {ALL_RIGHTS.map(right => (
                <div key={right} className='flex items-center gap-2'>
                  <Checkbox id={right} defaultChecked={editingAce?.rights.includes(right)} />
                  <label htmlFor={right} className='text-xs cursor-pointer'>{right}</label>
                </div>
              ))}
            </div>
          </div>

          <div className='flex justify-end gap-3'>
            <Button variant='outline' onClick={() => { setIsModalOpen(false); setEditingAce(null); }}>Cancel</Button>
            <Button disabled={isSubmitting} onClick={() => handleTogglePermission({} as any, 'add')}>
              {isSubmitting && <Loader2 className='h-4 w-4 animate-spin mr-2' />}
              {editingAce ? 'Save Changes' : 'Add Permission'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
