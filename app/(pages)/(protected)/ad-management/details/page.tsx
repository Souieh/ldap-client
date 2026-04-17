'use client';

import { ObjectProperties } from '@/components/ad/ObjectProperties';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAccountStatus, isAccountEnabled } from '@/lib/constants/ldap-attributes';
import {
  Briefcase,
  Calendar,
  ChevronLeft,
  Clock,
  Loader2,
  Mail,
  Monitor,
  Shield,
  User,
  Users2,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

function DetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dn = searchParams.get('dn');

  const [item, setItem] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  useEffect(() => {
    if (dn) {
      loadDetails();
    }
  }, [dn]);

  const loadDetails = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/ldap/objects/details?dn=${encodeURIComponent(dn!)}`);
      if (!res.ok) throw new Error('Failed to load object details');
      const data = await res.json();
      setItem(data);

      // If it's a group, load members
      if (data.objectClass.includes('group')) {
        loadGroupMembers(data.dn);
      }
    } catch (error) {
      console.error(error);
      toast.error('Error loading details');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroupMembers = async (groupDN: string) => {
    try {
      setIsLoadingMembers(true);
      const res = await fetch('/api/ldap/groups/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupDN }),
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  if (isLoading) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[400px]'>
        <Loader2 className='h-8 w-8 animate-spin text-primary mb-4' />
        <p className='text-muted-foreground'>Loading object details...</p>
      </div>
    );
  }

  if (!dn || !item) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[400px]'>
        <p className='text-xl font-semibold mb-4'>Object not found</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const isUser = item.objectClass.includes('user') && !item.objectClass.includes('computer');
  const isComputer = item.objectClass.includes('computer');
  const isGroup = item.objectClass.includes('group');

  const memberships = Array.isArray(item.memberOf)
    ? item.memberOf
    : item.memberOf
      ? [item.memberOf]
      : [];

  return (
    <div className='flex flex-col  '>
      <div className='flex-none mb-6'>
        <Button variant='ghost' onClick={() => router.back()} className='gap-2'>
          <ChevronLeft className='h-4 w-4' />
          Back to AD Manager
        </Button>
      </div>

      <div className='flex flex-1 gap-8 overflow-hidden'>
        {/* Left Column: Basic Info & Actions - Sticky/Non-scrolling wrapper */}
        <div className='w-80 flex-none space-y-6 overflow-y-auto pr-2 custom-scrollbar'>
          <div className='bg-card border rounded-xl p-6 shadow-sm'>
            <div className='flex flex-col items-center text-center'>
              <div className='w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4'>
                {isUser && <User className='h-10 w-10 text-primary' />}
                {isComputer && <Monitor className='h-10 w-10 text-primary' />}
                {isGroup && <Users2 className='h-10 w-10 text-primary' />}
              </div>
              <h1 className='text-xl font-bold break-all'>{item.displayName || item.cn}</h1>
              <p className='text-sm text-muted-foreground mb-4 font-mono text-xs'>
                {item.sAMAccountName}
              </p>

              {(isUser || isComputer) && (
                <div
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    isAccountEnabled(item.userAccountControl)
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {getAccountStatus(item.userAccountControl)}
                </div>
              )}
            </div>

            <div className='mt-8 space-y-4 pt-6 border-t'>
              {item.mail && (
                <div className='flex items-center gap-3 text-sm'>
                  <Mail className='h-4 w-4 text-muted-foreground shrink-0' />
                  <span className='truncate'>{item.mail}</span>
                </div>
              )}
              {item.title && (
                <div className='flex items-center gap-3 text-sm'>
                  <Briefcase className='h-4 w-4 text-muted-foreground shrink-0' />
                  <span>{item.title}</span>
                </div>
              )}
              {item.department && (
                <div className='flex items-center gap-3 text-sm'>
                  <Shield className='h-4 w-4 text-muted-foreground shrink-0' />
                  <span>{item.department}</span>
                </div>
              )}
              <div className='flex items-center gap-3 text-sm'>
                <Calendar className='h-4 w-4 text-muted-foreground shrink-0' />
                <span className='text-xs'>Created: {item.whenCreated}</span>
              </div>
              <div className='flex items-center gap-3 text-sm'>
                <Clock className='h-4 w-4 text-muted-foreground shrink-0' />
                <span className='text-xs'>Modified: {item.whenChanged}</span>
              </div>
            </div>
          </div>

          <div className='bg-card border rounded-xl p-6 shadow-sm'>
            <h3 className='text-sm font-semibold mb-4'>Distinguished Name</h3>
            <p className='text-[10px] font-mono bg-muted p-3 rounded-md break-all leading-relaxed text-muted-foreground'>
              {item.dn}
            </p>
          </div>
        </div>

        <div className='w-full'>
          <ObjectProperties objectDN={dn} objectName={item.name}  objectType={isUser ? 'user' : isComputer ? 'computer' : isGroup ? 'group' : 'unknown'
          }/>
        </div>
      </div>
    </div>
  );
}

export default function ADObjectDetailsPage() {
  return (
    <div className='min-h-screen bg-muted/30'>
      <Header />
      <main className='container mx-auto py-8 px-4 max-w-5xl'>
        <Suspense
          fallback={
            <div className='flex flex-col items-center justify-center min-h-[400px]'>
              <Loader2 className='h-8 w-8 animate-spin text-primary mb-4' />
              <p className='text-muted-foreground'>Loading details...</p>
            </div>
          }
        >
          <DetailsContent />
        </Suspense>
      </main>
    </div>
  );
}

const DirectMembers = ({ members, isLoading }: { members: any[]; isLoading: boolean }) => {
  const [searchKey, setSearchKey] = useState('');

  const filteredMembers = useMemo(() => {
    if (!searchKey) return members;
    const lowerKey = searchKey.toLowerCase();
    return members.filter((member) => {
      const name = (member.displayName || member.cn || '').toLowerCase();
      const sam = (member.sAMAccountName || '').toLowerCase();
      return name.includes(lowerKey) || sam.includes(lowerKey);
    });
  }, [members, searchKey]);

  return (
    <div>
      <div className='p-4 border-b bg-muted/5'>
        <div className='relative'>
          <Input
            placeholder='Filter members by name or account...'
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
            className='h-9 text-sm'
          />
        </div>
      </div>
      {isLoading && <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />}

      {members.length === 0 ? (
        <div className='p-12 text-center text-muted-foreground text-sm italic'>
          No members found in this group.
        </div>
      ) : filteredMembers.length > 0 ? (
        <div className='divide-y'>
          {filteredMembers.map((member) => (
            <div
              key={member.dn}
              className='px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors group'
            >
              <div className='min-w-0 flex items-center gap-3'>
                {member.type === 'User' && <User className='h-4 w-4 text-blue-500' />}
                {member.type === 'Group' && <Users2 className='h-4 w-4 text-purple-500' />}
                {member.type === 'Computer' && <Monitor className='h-4 w-4 text-green-500' />}
                <div className='truncate'>
                  <p className='text-sm font-medium truncate group-hover:text-primary transition-colors'>
                    {member.displayName || member.cn}
                  </p>
                  <p className='text-[10px] text-muted-foreground truncate font-mono'>
                    {member.sAMAccountName}
                  </p>
                </div>
              </div>
              <span className='text-[10px] bg-muted px-2 py-0.5 rounded-full border'>
                {member.type}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className='p-12 text-center text-muted-foreground text-sm italic'>
          No members match your filter.
        </div>
      )}
    </div>
  );
};

const GroupMembers = ({ memberships }: { memberships: any[] }) => {
  const [searchKey, setSearchKey] = useState('');

  const filteredMemberships = useMemo(() => {
    if (!searchKey) return memberships;
    const lowerKey = searchKey.toLowerCase();
    return memberships.filter((dn: string) => {
      const groupName = dn.split(',')[0].replace(/^CN=/i, '').toLowerCase();
      return dn.toLowerCase().includes(lowerKey) || groupName.includes(lowerKey);
    });
  }, [memberships, searchKey]);

  return (
    <div>
      <div className='p-4 border-b bg-muted/5'>
        <div className='relative'>
          <Input
            placeholder='Filter groups by name or DN...'
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
            className='h-9 text-sm'
          />
        </div>
      </div>
      {memberships.length === 0 ? (
        <div className='p-12 text-center text-muted-foreground text-sm italic'>
          This object is not a member of any groups.
        </div>
      ) : filteredMemberships.length > 0 ? (
        <div className='divide-y'>
          {filteredMemberships.map((groupDN: string) => {
            const groupName = groupDN.split(',')[0].replace(/^CN=/i, '');
            return (
              <div
                key={groupDN}
                className='px-6 py-4 flex flex-col hover:bg-muted/50 transition-colors group'
              >
                <p className='text-sm font-medium group-hover:text-primary transition-colors'>
                  {groupName}
                </p>
                <p className='text-[10px] text-muted-foreground truncate font-mono'>{groupDN}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className='p-12 text-center text-muted-foreground text-sm italic'>
          No groups match your filter.
        </div>
      )}
    </div>
  );
};
