'use client';

import React, { FC, useMemo, useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Edit, Info, Shield, Users, Users2, Loader2, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ObjectMembers } from './object-members';
import { ObjectParents } from './object-parents';
import { ObjectPermissions } from './object-permissions';
import { ObjectInfo } from './ObjectInfo';
import { ObjectEdit } from './ObjectEdit';
import { ObjectAccount } from './ObjectAccount';
import { DeleteObjectModal } from './delete-object-modal';
import { MoveObjectModal } from './move-object-modal';
import { toast } from 'sonner';

interface GroupObjectsProps {
  objectDN: string;
  objectName: string;
  objectType: string;
}

interface GroupObjectsModalProps extends GroupObjectsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TabConfig {
  key: string;
  title: string;
  icon?: any;
  content: FC<any>;
  showFor?: string[];
  props?: Record<string, any>;
}

const tabs: TabConfig[] = [
  {
    key: 'Details',
    icon: <Info className='h-4 w-4 text-primary' />,
    title: 'Details',
    content: ObjectInfo,
  },
  {
    key: 'Edit',
    icon: <Edit className='h-4 w-4 text-primary' />,
    title: 'Edit',
    content: ObjectEdit,
    showFor: ['user', 'group'],
  },
  {
    key: 'Account',
    icon: <Settings className='h-4 w-4 text-primary' />,
    title: 'Account',
    content: ObjectAccount,
    showFor: ['user', 'computer'],
  },
  {
    key: 'Member Of',
    icon: <Users className='h-4 w-4 text-primary' />,
    title: 'Member Of',
    content: ObjectParents,
    props: { hideContainer: true }
  },
  {
    key: 'Members',
    icon: <Users2 className='h-4 w-4 text-primary' />,
    title: 'Members',
    content: ObjectMembers,
    showFor: ['group'],
    props: { hideContainer: true }
  },
  {
    key: 'Permissions',
    icon: <Shield className='h-4 w-4 text-primary' />,
    title: 'Permissions',
    content: ObjectPermissions,
  },
];

export function ObjectProperties({
  objectDN,
  objectName,
  objectType,
  onSuccess
}: GroupObjectsProps & { onSuccess?: (newDN?: string) => void }) {
  const [item, setItem] = useState<any>(null);
  const [currentDN, setCurrentDN] = useState(objectDN);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [allOUs, setAllOUs] = useState<any[]>([]);

  const loadDetails = async (dnToLoad = currentDN) => {
    try {
      setIsLoading(true);
      setError(null);
      const [detailsRes, ousRes] = await Promise.all([
        fetch(`/api/ldap/objects/details?dn=${encodeURIComponent(dnToLoad)}`),
        fetch('/api/ldap/ous')
      ]);

      if (!detailsRes.ok) {
        const errData = await detailsRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to load object details');
      }

      const data = await detailsRes.json();
      setItem(data);

      if (ousRes.ok) {
        const ous = await ousRes.json();
        setAllOUs(ous);
      }
    } catch (error: any) {
      console.error(error);
      setError(error.message);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchOnMount = async () => {
      if (isMounted) {
        setCurrentDN(objectDN);
        await loadDetails(objectDN);
      }
    };
    fetchOnMount();
    return () => { isMounted = false; };
  }, [objectDN]);

  const availableTabs = useMemo(
    () => tabs.filter((t) => !t.showFor || t.showFor.includes(objectType.toLowerCase())),
    [objectType]
  );

  if (isLoading) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[400px] bg-card border rounded-xl shadow-sm'>
        <Loader2 className='h-8 w-8 animate-spin text-primary mb-4' />
        <p className='text-muted-foreground text-sm'>Loading details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[400px] bg-card border rounded-xl shadow-sm p-8 text-center'>
        <div className='w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4'>
          <Shield className='h-6 w-6 text-destructive' />
        </div>
        <h3 className='text-lg font-semibold mb-2'>Connection Error</h3>
        <p className='text-muted-foreground text-sm max-w-md mb-6'>
          {error}. This may be due to a temporary connection issue or the object being moved or deleted.
        </p>
        <Button onClick={() => loadDetails()} className='gap-2'>
          <Edit className='h-4 w-4 rotate-180' />
          Retry Connection
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-4 p-2'>
      <div className='flex items-center justify-between px-2'>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='text-destructive hover:bg-destructive/10'
            onClick={() => setIsDeleteOpen(true)}
          >
            Delete Object
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setIsMoveOpen(true)}
          >
            Move Object
          </Button>
        </div>
      </div>

      <div className='min-w-0 bg-card border rounded-xl shadow-sm flex flex-col'>
        <Tabs defaultValue={availableTabs[0].key} className="flex flex-col">
          <div className='px-4 pt-4 bg-muted/20 inline-flex sticky top-0 z-20 border-b'>
            <TabsList className='flex-start whitespace-nowrap mb-[-1px]'>
              {availableTabs.map((t) => (
                <TabsTrigger key={t.key} value={t.key} className='gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none'>
                  {t.icon}
                  {t.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className='bg-muted/20'>
            {availableTabs.map((tab) => (
              <TabsContent key={tab.key} value={tab.key} className='m-0 focus-visible:ring-0 p-4'>
                <tab.content
                  objectDN={currentDN}
                  objectName={objectName}
                  item={item}
                  onSuccess={loadDetails}
                  {...(tab.props || {})}
                />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>

      <DeleteObjectModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        dn={currentDN}
        name={objectName}
        type={objectType}
        onSuccess={() => {
          setIsDeleteOpen(false);
          if (onSuccess) onSuccess();
        }}
      />

      <MoveObjectModal
        isOpen={isMoveOpen}
        onClose={() => setIsMoveOpen(false)}
        dn={currentDN}
        name={objectName}
        ous={allOUs}
        onSuccess={(newDN) => {
          setIsMoveOpen(false);
          if (newDN) {
            setCurrentDN(newDN);
            loadDetails(newDN);
            if (onSuccess) onSuccess(newDN);
          } else {
            loadDetails();
          }
        }}
      />
    </div>
  );
}

export function ObjectPropertiesModal({
  isOpen,
  onClose,
  objectDN,
  objectName,
  objectType,
  onSuccess,
}: GroupObjectsModalProps & { onSuccess?: (newDN?: string) => void }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Properties: ${objectName}`}
      description={`Viewing and managing properties for "${objectName}"`}
      size='4xl'
    >
      <ObjectProperties
        objectDN={objectDN}
        objectName={objectName}
        objectType={objectType}
        onSuccess={(newDN) => {
          if (onSuccess) onSuccess(newDN);
          if (!newDN) {
            onClose();
          }
        }}
      />
    </Modal>
  );
}
