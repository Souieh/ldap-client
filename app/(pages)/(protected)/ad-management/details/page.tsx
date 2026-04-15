'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2, User, Users2, Monitor, Mail, Shield, Calendar, Clock, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { getAccountStatus, isAccountEnabled } from '@/lib/constants/ldap-attributes';

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
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading object details...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-xl font-semibold mb-4">Object not found</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const isUser = item.objectClass.includes('user') && !item.objectClass.includes('computer');
  const isComputer = item.objectClass.includes('computer');
  const isGroup = item.objectClass.includes('group');

  const memberships = Array.isArray(item.memberOf) ? item.memberOf : item.memberOf ? [item.memberOf] : [];

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-2 gap-2">
        <ChevronLeft className="h-4 w-4" />
        Back to AD Manager
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Basic Info & Actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                {isUser && <User className="h-10 w-10 text-primary" />}
                {isComputer && <Monitor className="h-10 w-10 text-primary" />}
                {isGroup && <Users2 className="h-10 w-10 text-primary" />}
              </div>
              <h1 className="text-xl font-bold break-all">{item.displayName || item.cn}</h1>
              <p className="text-sm text-muted-foreground mb-4 font-mono">{item.sAMAccountName}</p>

              {(isUser || isComputer) && (
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  isAccountEnabled(item.userAccountControl)
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {getAccountStatus(item.userAccountControl)}
                </div>
              )}
            </div>

            <div className="mt-8 space-y-4 pt-6 border-t">
              {item.mail && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{item.mail}</span>
                </div>
              )}
              {item.title && (
                <div className="flex items-center gap-3 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{item.title}</span>
                </div>
              )}
              {item.department && (
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span>{item.department}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Created: {item.whenCreated}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Modified: {item.whenChanged}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold mb-4">Distinguished Name</h3>
            <p className="text-xs font-mono bg-muted p-3 rounded-md break-all leading-relaxed text-muted-foreground">
              {item.dn}
            </p>
          </div>
        </div>

        {/* Right Column: Detailed Lists */}
        <div className="lg:col-span-2 space-y-6">
          {/* Group Members (if group) */}
          {isGroup && (
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users2 className="h-4 w-4 text-primary" />
                  Members ({members.length})
                </h3>
                {isLoadingMembers && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              <div className="p-0">
                {members.length > 0 ? (
                  <div className="divide-y max-h-[400px] overflow-y-auto">
                    {members.map((member) => (
                      <div key={member.dn} className="px-6 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                        <div className="min-w-0 flex items-center gap-3">
                          {member.type === 'User' && <User className="h-4 w-4 text-blue-500" />}
                          {member.type === 'Group' && <Users2 className="h-4 w-4 text-purple-500" />}
                          {member.type === 'Computer' && <Monitor className="h-4 w-4 text-green-500" />}
                          <div className="truncate">
                            <p className="text-sm font-medium truncate">{member.displayName || member.cn}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{member.sAMAccountName}</p>
                          </div>
                        </div>
                        <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full border">{member.type}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-muted-foreground text-sm italic">
                    No members found in this group.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Member Of (for all objects) */}
          <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Member Of ({memberships.length})
              </h3>
            </div>
            <div className="p-0">
              {memberships.length > 0 ? (
                <div className="divide-y max-h-[400px] overflow-y-auto">
                  {memberships.map((groupDN: string) => {
                    const groupName = groupDN.split(',')[0].replace(/^CN=/i, '');
                    return (
                      <div key={groupDN} className="px-6 py-3 flex flex-col hover:bg-muted/50 transition-colors">
                        <p className="text-sm font-medium">{groupName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{groupDN}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center text-muted-foreground text-sm italic">
                  This object is not a member of any groups.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ADObjectDetailsPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container mx-auto py-8 px-4 max-w-5xl">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading details...</p>
          </div>
        }>
          <DetailsContent />
        </Suspense>
      </main>
    </div>
  );
}
