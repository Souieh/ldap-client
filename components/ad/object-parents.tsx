'use client';

import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Loader2, Mail, Monitor, Shield, User, Users2 } from 'lucide-react';
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

interface GroupParentsProps {
  objectDN: string;
  objectName: string;
}
interface GroupParentsModalProps extends GroupParentsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ObjectParents({ objectDN, objectName }: GroupParentsProps) {
  const [parents, setParents] = useState<Parent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchKey, setSearchKey] = useState('');

  const filteredParents = useMemo(() => {
    if (!searchKey) return parents;
    const lowerKey = searchKey.toLowerCase();
    return parents.filter((parent) => {
      const name = (parent.displayName || parent.cn || '').toLowerCase();
      const sam = (parent.sAMAccountName || '').toLowerCase();
      const mail = (parent.mail || '').toLowerCase();
      return name.includes(lowerKey) || sam.includes(lowerKey) || mail.includes(lowerKey);
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

      if (!res.ok) {
        throw new Error('Failed to load group parents');
      }

      const data = await res.json();
      setParents(data);
    } catch (error) {
      console.error(error);
      toast.error('Error loading group parents');
    } finally {
      setIsLoading(false);
    }
  };

  const getParentIcon = (type: string) => {
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
            Parent List ({parents.length})
          </h4>
          {isLoading && <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />}
        </div>

        <div className='relative'>
          <Input
            placeholder='Filter parents by name, account, or email...'
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
            className='h-9 text-sm'
          />
        </div>

        <div className='max-h-[400px] overflow-y-auto border rounded-md bg-muted/30'>
          {isLoading ? (
            <div className='flex flex-col items-center justify-center p-12 text-center text-muted-foreground'>
              <Loader2 className='h-8 w-8 animate-spin mb-2' />
              <p className='text-sm italic'>Fetching parent details...</p>
            </div>
          ) : parents.length === 0 ? (
            <div className='flex flex-col items-center justify-center p-12 text-center text-muted-foreground italic text-sm'>
              This group has no parents.
            </div>
          ) : filteredParents.length > 0 ? (
            <div className='p-2 space-y-1'>
              {filteredParents.map((parent) => (
                <div
                  key={parent.dn}
                  className='flex items-center justify-between gap-3 p-3 bg-background border rounded-md'
                >
                  <div className='flex items-start gap-3 min-w-0'>
                    <div className='mt-1 shrink-0'>{getParentIcon(parent.type)}</div>
                    <div className='truncate'>
                      <div className='flex items-center gap-2'>
                        <p className='text-sm font-semibold truncate'>
                          {parent.displayName || parent.cn}
                        </p>
                        <span className='text-[10px] px-1.5 py-0.5 rounded-full bg-muted border font-medium'>
                          {parent.type}
                        </span>
                      </div>
                      <p className='text-xs text-muted-foreground truncate font-mono'>
                        {parent.sAMAccountName}
                      </p>
                      {parent.mail && (
                        <div className='flex items-center gap-1 mt-1'>
                          <Mail className='h-3 w-3 text-muted-foreground/60' />
                          <p className='text-[10px] text-muted-foreground truncate'>
                            {parent.mail}
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
              No parents match your filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ObjectParentsModal({
  isOpen,
  onClose,
  objectDN,
  objectName,
}: GroupParentsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Parents: ${objectName}`}
      description={`Viewing all parents of the group "${objectName}"`}
      size='lg'
    >
      <ObjectParents objectDN={objectDN} objectName={objectName} />
    </Modal>
  );
}
