'use client';

import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Loader2, Mail, Monitor, Shield, User, Users2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

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
}
interface GroupMembersModalProps extends GroupMembersProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ObjectMembers({ objectDN, objectName }: GroupMembersProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchKey, setSearchKey] = useState('');

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

      if (!res.ok) {
        throw new Error('Failed to load group members');
      }

      const data = await res.json();
      setMembers(data);
    } catch (error) {
      console.error(error);
      toast.error('Error loading group members');
    } finally {
      setIsLoading(false);
    }
  };

  const getMemberIcon = (type: string) => {
    switch (type) {
      case 'User':
        return <User className='h-4 w-4 text-blue-500' />;
      case 'Group':
        return <Users2 className='h-4 w-4 text-purple-500' />;
      case 'Computer':
        return <Monitor className='h-4 w-4 text-green-500' />;
      default:
        return <Shield className='h-4 w-4 text-muted-foreground' />;
    }
  };

  return (
    <div className='space-y-4 py-2'>
      <div className='space-y-2'>
        <div className='flex items-center justify-between'>
          <h4 className='text-xs font-bold text-muted-foreground uppercase tracking-wider'>
            Member List ({members.length})
          </h4>
          {isLoading && <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />}
        </div>

        <div className='relative'>
          <Input
            placeholder='Filter members by name, account, or email...'
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
            className='h-9 text-sm'
          />
        </div>

        <div className='max-h-[400px] overflow-y-auto border rounded-md bg-muted/30'>
          {isLoading ? (
            <div className='flex flex-col items-center justify-center p-12 text-center text-muted-foreground'>
              <Loader2 className='h-8 w-8 animate-spin mb-2' />
              <p className='text-sm italic'>Fetching member details...</p>
            </div>
          ) : members.length === 0 ? (
            <div className='flex flex-col items-center justify-center p-12 text-center text-muted-foreground italic text-sm'>
              This group has no members.
            </div>
          ) : filteredMembers.length > 0 ? (
            <div className='p-2 space-y-1'>
              {filteredMembers.map((member) => (
                <div
                  key={member.dn}
                  className='flex items-center justify-between gap-3 p-3 bg-background border rounded-md'
                >
                  <div className='flex items-start gap-3 min-w-0'>
                    <div className='mt-1 shrink-0'>{getMemberIcon(member.type)}</div>
                    <div className='truncate'>
                      <div className='flex items-center gap-2'>
                        <p className='text-sm font-semibold truncate'>
                          {member.displayName || member.cn}
                        </p>
                        <span className='text-[10px] px-1.5 py-0.5 rounded-full bg-muted border font-medium'>
                          {member.type}
                        </span>
                      </div>
                      <p className='text-xs text-muted-foreground truncate font-mono'>
                        {member.sAMAccountName}
                      </p>
                      {member.mail && (
                        <div className='flex items-center gap-1 mt-1'>
                          <Mail className='h-3 w-3 text-muted-foreground/60' />
                          <p className='text-[10px] text-muted-foreground truncate'>
                            {member.mail}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='flex flex-col items-center justify-center p-12 text-center text-muted-foreground italic text-sm'>
              No members match your filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ObjectMembersModal({
  isOpen,
  onClose,
  objectDN,
  objectName,
}: GroupMembersModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Members: ${objectName}`}
      description={`Viewing all members of the group "${objectName}"`}
      size='lg'
    >
      <ObjectMembers objectDN={objectDN} objectName={objectName} />
    </Modal>
  );
}
