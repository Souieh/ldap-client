'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Loader2, Plus, Shield, Trash2, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface Parent {
  dn: string;
  cn: string;
  sAMAccountName: string;
  displayName?: string;
  mail?: string;
  type: 'User' | 'Group' | 'Computer' | 'Unknown';
}

interface ObjectParentsProps {
  objectDN: string;
  objectName: string;
  onSuccess?: () => void;
}

export function ObjectParents({ objectDN, objectName, onSuccess }: ObjectParentsProps) {
  const [parents, setParents] = useState<Parent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchKey, setSearchKey] = useState('');

  // Group Search State
  const [isSearchingGroups, setIsSearchingGroups] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Parent[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const filteredParents = useMemo(() => {
    if (!searchKey) return parents;
    const lowerKey = searchKey.toLowerCase();
    return parents.filter((parent) => {
      const name = (parent.displayName || parent.cn || '').toLowerCase();
      const sam = (parent.sAMAccountName || '').toLowerCase();
      return name.includes(lowerKey) || sam.includes(lowerKey);
    });
  }, [parents, searchKey]);

  useEffect(() => {
    loadParents();
  }, [objectDN]);

  const loadParents = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/ldap/objects/parents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectDN }),
      });

      if (!res.ok) throw new Error('Failed to load group parents');
      const data = await res.json();
      setParents(data);
    } catch (error) {
      console.error(error);
      toast.error('Error loading group parents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMember = async (groupDN: string, action: 'add' | 'delete') => {
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/ldap/objects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dn: objectDN,
          action: 'toggle-member',
          payload: {
            groupDN,
            memberDN: objectDN,
            type: action,
          },
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || `Failed to ${action === 'add' ? 'join' : 'leave'} group`);
      }

      toast.success(action === 'add' ? 'Joined group successfully' : 'Left group successfully');
      loadParents();
      if (onSuccess) onSuccess();
      if (action === 'add') {
        setIsSearchingGroups(false);
        setGroupSearchQuery('');
        setSearchResults([]);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const searchGroups = async () => {
    if (!groupSearchQuery.trim()) return;
    try {
      setIsSearching(true);
      const res = await fetch('/api/ldap/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ouDN: 'ROOT',
          objectType: 'group',
          scope: 'sub'
        }),
      });

      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();

      // Filter results based on query and exclude groups already joined
      const query = groupSearchQuery.toLowerCase();
      const existingDNs = new Set(parents.map(p => p.dn));

      const results = data
        .filter((g: any) => {
          const name = (g.displayName || g.cn || '').toLowerCase();
          const sam = (g.sAMAccountName || '').toLowerCase();
          return (name.includes(query) || sam.includes(query)) && !existingDNs.has(g.dn);
        })
        .map((g: any) => ({
          dn: g.dn,
          cn: g.cn,
          sAMAccountName: g.sAMAccountName,
          displayName: g.displayName,
          type: 'Group' as const
        }));

      setSearchResults(results);
    } catch (error) {
      console.error(error);
      toast.error('Error searching groups');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className='space-y-4 py-2'>
      {/* Header & Search */}
      <div className='flex items-center justify-between gap-4'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Filter joined groups...'
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
            className='pl-9 h-9 text-sm'
          />
        </div>
        <Button
          size='sm'
          className='gap-2'
          onClick={() => setIsSearchingGroups(true)}
          disabled={isSubmitting}
        >
          <Plus className='h-4 w-4' />
          Join Group
        </Button>
      </div>

      {/* Group List */}
      <div className='border rounded-lg overflow-hidden bg-card shadow-sm'>
        <div className='bg-muted/30 px-4 py-2 border-b flex items-center justify-between'>
          <h4 className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>
            Direct Memberships ({parents.length})
          </h4>
          {isLoading && <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />}
        </div>

        <div className='divide-y'>
          {isLoading && parents.length === 0 ? (
            <div className='flex flex-col items-center justify-center p-12 text-center text-muted-foreground'>
              <Loader2 className='h-8 w-8 animate-spin mb-2' />
              <p className='text-sm italic'>Loading memberships...</p>
            </div>
          ) : parents.length === 0 ? (
            <div className='p-12 text-center text-muted-foreground italic text-sm'>
              This object is not a direct member of any groups.
            </div>
          ) : filteredParents.length > 0 ? (
            filteredParents.map((parent) => (
              <div
                key={parent.dn}
                className='px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors group'
              >
                <div className='flex items-center gap-3 min-w-0'>
                  <Shield className='h-4 w-4 text-purple-500 shrink-0' />
                  <div className='truncate'>
                    <p className='text-sm font-medium truncate group-hover:text-primary transition-colors'>
                      {parent.displayName || parent.cn}
                    </p>
                    <p className='text-[10px] text-muted-foreground truncate font-mono'>
                      {parent.sAMAccountName}
                    </p>
                  </div>
                </div>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-8 px-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity gap-1.5'
                  onClick={() => handleToggleMember(parent.dn, 'delete')}
                  disabled={isSubmitting}
                >
                  <Trash2 className='h-3.5 w-3.5' />
                  <span className='text-xs'>Leave</span>
                </Button>
              </div>
            ))
          ) : (
            <div className='p-12 text-center text-muted-foreground italic text-sm'>
              No groups match your filter.
            </div>
          )}
        </div>
      </div>

      {/* Join Group Search Section */}
      {isSearchingGroups && (
        <div className='border rounded-lg overflow-hidden bg-muted/10 animate-in fade-in slide-in-from-top-2'>
          <div className='p-4 space-y-4'>
            <div className='flex items-center justify-between'>
              <h4 className='text-xs font-bold uppercase tracking-wider'>Join a Group</h4>
              <Button
                variant='ghost'
                size='icon'
                className='h-6 w-6'
                onClick={() => {
                  setIsSearchingGroups(false);
                  setSearchResults([]);
                  setGroupSearchQuery('');
                }}
              >
                <X className='h-4 w-4' />
              </Button>
            </div>

            <div className='flex gap-2'>
              <Input
                placeholder='Search for groups by name...'
                value={groupSearchQuery}
                onChange={(e) => setGroupSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchGroups()}
                className='h-9 text-sm'
                autoFocus
              />
              <Button
                size='sm'
                variant='secondary'
                onClick={searchGroups}
                disabled={isSearching || !groupSearchQuery.trim()}
              >
                {isSearching ? <Loader2 className='h-4 w-4 animate-spin' /> : <Search className='h-4 w-4' />}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className='border rounded-md bg-background divide-y max-h-[200px] overflow-y-auto'>
                {searchResults.map((group) => (
                  <div key={group.dn} className='px-3 py-2 flex items-center justify-between gap-3'>
                    <div className='min-w-0'>
                      <p className='text-xs font-medium truncate'>{group.displayName || group.cn}</p>
                      <p className='text-[10px] text-muted-foreground truncate font-mono'>{group.sAMAccountName}</p>
                    </div>
                    <Button
                      size='sm'
                      variant='outline'
                      className='h-7 px-2 gap-1'
                      onClick={() => handleToggleMember(group.dn, 'add')}
                      disabled={isSubmitting}
                    >
                      <Plus className='h-3 w-3' />
                      Join
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {isSearching && (
              <div className='flex items-center justify-center p-4'>
                <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
              </div>
            )}

            {!isSearching && groupSearchQuery && searchResults.length === 0 && (
              <p className='text-[11px] text-center text-muted-foreground italic'>
                Search results will appear here...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ObjectParentsModal({
  isOpen,
  onClose,
  objectDN,
  objectName,
  onSuccess,
}: any) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Memberships: ${objectName}`}
      description={`Manage group memberships for "${objectName}"`}
      size='lg'
    >
      <ObjectParents objectDN={objectDN} objectName={objectName} onSuccess={onSuccess} />
    </Modal>
  );
}
