'use client';

import { Modal } from '@/components/ui/modal';
import { Edit, Info, Shield, Users, Users2, Loader2, Settings } from 'lucide-react';
import { FC, useMemo, useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
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
  },
  {
    key: 'Members',
    icon: <Users2 className='h-4 w-4 text-primary' />,
    title: 'Members',
    content: ObjectMembers,
    showFor: ['group'],
  },
  {
    key: 'Permissions',
    icon: <Shield className='h-4 w-4 text-primary' />,
    title: 'Permissions',
    content: ObjectPermissions,
  },
];

export function ObjectProperties({ objectDN, objectName, objectType, onSuccess }: GroupObjectsProps & { onSuccess?: () => void }) {
  const [item, setItem] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [allOUs, setAllOUs] = useState<any[]>([]);

  const loadDetails = async () => {
    try {
      setIsLoading(true);
      const [detailsRes, ousRes] = await Promise.all([
        fetch(`/api/ldap/objects/details?dn=${encodeURIComponent(objectDN)}`),
        fetch('/api/ldap/ous')
      ]);

      if (!detailsRes.ok) throw new Error('Failed to load object details');
      const data = await detailsRes.json();
      setItem(data);

      if (ousRes.ok) {
        const ous = await ousRes.json();
        setAllOUs(ous);
      }
    } catch (error) {
      console.error(error);
      toast.error('Error loading details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
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

      <div className='flex-1 min-w-0 bg-card border rounded-xl shadow-sm flex flex-col overflow-hidden'>
        <Tabs defaultValue={availableTabs[0].key}>
          <div className='px-4 pt-4 bg-muted/20 inline-flex overflow-x-auto no-scrollbar'>
            <TabsList className='flex-start whitespace-nowrap'>
              {availableTabs.map((t) => (
                <TabsTrigger key={t.key} value={t.key} className='gap-2'>
                  {t.icon}
                  {t.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className='flex-1 overflow-y-auto bg-muted/20'>
            {availableTabs.map((tab) => (
              <TabsContent key={tab.key} value={tab.key} className='m-0 focus-visible:ring-0 p-2'>
                <tab.content
                  objectDN={objectDN}
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
        dn={objectDN}
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
        dn={objectDN}
        name={objectName}
        ous={allOUs}
        onSuccess={() => {
          setIsMoveOpen(false);
          loadDetails();
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
}: GroupObjectsModalProps & { onSuccess?: () => void }) {
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
        onSuccess={() => {
          if (onSuccess) onSuccess();
          onClose();
        }}
      />
    </Modal>
  );
}
