'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Loader2, Mail, Monitor, Plus, Shield, User, Users2, X, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Member {
  dn: string;
  cn: string;
  sAMAccountName: string;
  displayName?: string;
  mail?: string;
  type: 'User' | 'Group' | 'Computer' | 'Unknown';
}

interface GroupMembersProps {
  objectDN: string;
  objectName: string;
  onSuccess?: () => void;
}

export function ObjectMembers({ objectDN, objectName, onSuccess }: GroupMembersProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchKey, setSearchKey] = useState('');

  // Add Member State
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberTypeFilter, setMemberTypeFilter] = useState('user');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const filteredMembers = useMemo(() => {
    if (!searchKey) return members;
    const lowerKey = searchKey.toLowerCase();
    return members.filter((member) => {
      const name = (member.displayName || member.cn || '').toLowerCase();
      const sam = (member.sAMAccountName || '').toLowerCase();
      const mail = (member.mail || '').toLowerCase();
      return name.includes(lowerKey) || sam.includes(lowerKey) || mail.includes(lowerKey);
    });
  }, [members, searchKey]);

  useEffect(() => {
    loadMembers();
  }, [objectDN]);

  const loadMembers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/ldap/objects/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectDN }),
      });

      if (!res.ok) throw new Error('Failed to load group members');
      const data = await res.json();
      setMembers(data);
    } catch (error) {
      console.error(error);
      toast.error('Error loading group members');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMember = async (memberDN: string, action: 'add' | 'delete', memberType: string) => {
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/ldap/objects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dn: objectDN,
          action: 'toggle-member',
          payload: {
            groupDN: objectDN,
            memberDN,
            type: action,
          },
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || `Failed to ${action === 'add' ? 'add' : 'remove'} member`);
      }

      toast.success(action === 'add' ? 'Member added successfully' : 'Member removed successfully');
      loadMembers();
      if (onSuccess) onSuccess();
      if (action === 'add') {
        setIsAddingMember(false);
        setMemberSearchQuery('');
        setSearchResults([]);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const searchObjects = async () => {
    if (!memberSearchQuery.trim()) return;
    try {
      setIsSearching(true);
      const res = await fetch('/api/ldap/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ouDN: 'ROOT',
          objectType: memberTypeFilter,
          scope: 'sub'
        }),
      });

      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();

      const query = memberSearchQuery.toLowerCase();
      const existingDNs = new Set(members.map(m => m.dn));

      const results = data
        .filter((obj: any) => {
          if (obj.dn === objectDN) return false; // Can't add group to itself
          const name = (obj.displayName || obj.cn || '').toLowerCase();
          const sam = (obj.sAMAccountName || '').toLowerCase();
          return (name.includes(query) || sam.includes(query)) && !existingDNs.has(obj.dn);
        })
        .map((obj: any) => ({
          dn: obj.dn,
          cn: obj.cn,
          sAMAccountName: obj.sAMAccountName,
          displayName: obj.displayName,
          mail: obj.mail,
          type: (memberTypeFilter.charAt(0).toUpperCase() + memberTypeFilter.slice(1)) as any
        }));

      setSearchResults(results);
    } catch (error) {
      console.error(error);
      toast.error('Error searching objects');
    } finally {
      setIsSearching(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'User': return <User className='h-4 w-4 text-blue-500' />;
      case 'Group': return <Users2 className='h-4 w-4 text-purple-500' />;
      case 'Computer': return <Monitor className='h-4 w-4 text-green-500' />;
      default: return <Shield className='h-4 w-4 text-muted-foreground' />;
    }
  };

  return (
    <div className='space-y-4 py-2'>
      {/* Header & Filter */}
      <div className='flex items-center justify-between gap-4'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Filter members...'
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
            className='pl-9 h-9 text-sm'
          />
        </div>
        <Button
          size='sm'
          className='gap-2'
          onClick={() => setIsAddingMember(true)}
          disabled={isSubmitting}
        >
          <Plus className='h-4 w-4' />
          Add Member
        </Button>
      </div>

      {/* Member List */}
      <div className='border rounded-lg overflow-hidden bg-card shadow-sm'>
        <div className='bg-muted/30 px-4 py-2 border-b flex items-center justify-between'>
          <h4 className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>
            Direct Members ({members.length})
          </h4>
          {isLoading && <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />}
        </div>

        <div className='divide-y'>
          {isLoading && members.length === 0 ? (
            <div className='flex flex-col items-center justify-center p-12 text-center text-muted-foreground'>
              <Loader2 className='h-8 w-8 animate-spin mb-2' />
              <p className='text-sm italic'>Loading members...</p>
            </div>
          ) : members.length === 0 ? (
            <div className='p-12 text-center text-muted-foreground italic text-sm'>
              This group has no direct members.
            </div>
          ) : filteredMembers.length > 0 ? (
            filteredMembers.map((member) => (
              <div
                key={member.dn}
                className='px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors group'
              >
                <div className='flex items-start gap-3 min-w-0'>
                  <div className='mt-0.5 shrink-0'>{getIcon(member.type)}</div>
                  <div className='truncate'>
                    <div className='flex items-center gap-2'>
                      <p className='text-sm font-medium truncate group-hover:text-primary transition-colors'>
                        {member.displayName || member.cn}
                      </p>
                      <span className='text-[9px] px-1.5 py-0.5 rounded-full bg-muted border font-medium uppercase'>
                        {member.type}
                      </span>
                    </div>
                    <p className='text-[10px] text-muted-foreground truncate font-mono'>
                      {member.sAMAccountName}
                    </p>
                  </div>
                </div>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-8 px-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity gap-1.5'
                  onClick={() => handleToggleMember(member.dn, 'delete', member.type)}
                  disabled={isSubmitting}
                >
                  <Trash2 className='h-3.5 w-3.5' />
                  <span className='text-xs'>Remove</span>
                </Button>
              </div>
            ))
          ) : (
            <div className='p-12 text-center text-muted-foreground italic text-sm'>
              No members match your filter.
            </div>
          )}
        </div>
      </div>

      {/* Add Member Search Section */}
      {isAddingMember && (
        <div className='border rounded-lg overflow-hidden bg-muted/10 animate-in fade-in slide-in-from-top-2'>
          <div className='p-4 space-y-4'>
            <div className='flex items-center justify-between'>
              <h4 className='text-xs font-bold uppercase tracking-wider'>Add a Member</h4>
              <Button
                variant='ghost'
                size='icon'
                className='h-6 w-6'
                onClick={() => {
                  setIsAddingMember(false);
                  setSearchResults([]);
                  setMemberSearchQuery('');
                }}
              >
                <X className='h-4 w-4' />
              </Button>
            </div>

            <div className='flex gap-2'>
              <Select value={memberTypeFilter} onValueChange={setMemberTypeFilter}>
                <SelectTrigger className="w-[120px] h-9 text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                  <SelectItem value="computer">Computer</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder='Search for objects to add...'
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchObjects()}
                className='h-9 text-sm flex-1'
                autoFocus
              />
              <Button
                size='sm'
                variant='secondary'
                onClick={searchObjects}
                disabled={isSearching || !memberSearchQuery.trim()}
              >
                {isSearching ? <Loader2 className='h-4 w-4 animate-spin' /> : <Search className='h-4 w-4' />}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className='border rounded-md bg-background divide-y max-h-[200px] overflow-y-auto'>
                {searchResults.map((obj) => (
                  <div key={obj.dn} className='px-3 py-2 flex items-center justify-between gap-3'>
                    <div className='min-w-0 flex items-center gap-2'>
                      {getIcon(obj.type)}
                      <div className='truncate'>
                        <p className='text-xs font-medium truncate'>{obj.displayName || obj.cn}</p>
                        <p className='text-[10px] text-muted-foreground truncate font-mono'>{obj.sAMAccountName}</p>
                      </div>
                    </div>
                    <Button
                      size='sm'
                      variant='outline'
                      className='h-7 px-2 gap-1'
                      onClick={() => handleToggleMember(obj.dn, 'add', obj.type)}
                      disabled={isSubmitting}
                    >
                      <Plus className='h-3 w-3' />
                      Add
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

            {!isSearching && memberSearchQuery && searchResults.length === 0 && (
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

export function ObjectMembersModal({
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
      title={`Members: ${objectName}`}
      description={`Manage members for the group "${objectName}"`}
      size='lg'
    >
      <ObjectMembers objectDN={objectDN} objectName={objectName} onSuccess={onSuccess} />
    </Modal>
  );
}
