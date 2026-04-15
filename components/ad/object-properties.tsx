'use client';

import { Modal } from '@/components/ui/modal';
import { Info, Shield, Users, Users2 } from 'lucide-react';
import { FC, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ObjectMembers } from './object-members';
import { ObjectParents } from './object-parents';
import { ObjectPermissions } from './object-permissions';

interface Object {
  dn: string;
  cn: string;
  sAMAccountName: string;
  displayName?: string;
  mail?: string;
  type: 'User' | 'Group' | 'Computer' | 'Unknown';
}

interface GroupObjectsProps {
  objectDN: string;
  objectName: string;
  objectType: string;
}
interface GroupObjectsModalProps extends GroupObjectsProps {
  isOpen: boolean;
  onClose: () => void;
}
const tabs: {
  key: string;
  title: string;
  icon?: any;
  content: FC<any>;
  hideFor?: string[];
}[] = [
  {
    key: 'Info',
    icon: <Info className='h-4 w-4 text-primary' />,
    title: 'Info',
    content: () => <p></p>,
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
    hideFor: ['group'],
  },
  {
    key: 'Permissions',
    icon: <Shield className='h-4 w-4 text-primary' />,
    title: 'Permissions',
    content: ObjectPermissions,
  },
];
export function ObjectProperties({ objectDN, objectName, objectType }: GroupObjectsProps) {
  const availableTabs = useMemo(
    () => tabs.filter((t) => !t.hideFor || t.hideFor.includes(objectType)),
    [objectType]
  );
  return (
    <div className='space-y-4 p-2'>
      <div className='flex-1 min-w-0 bg-card border rounded-xl shadow-sm flex flex-col overflow-hidden'>
        <Tabs defaultValue={availableTabs[0].key}>
          <div className='px-4 pt-4 bg-muted/20 inline-flex'>
            <TabsList className=' flex-1 flex-start'>
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
              <TabsContent value={tab.key} className='m-0 focus-visible:ring-0 p-2'>
                <tab.content objectDN={objectDN} objectName={objectName} />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </div>
  );
}

export function ObjectPropertiesModal({
  isOpen,
  onClose,
  objectDN,
  objectName,
  objectType,
}: GroupObjectsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Objects: ${objectName}`}
      description={`Viewing all objects of the group "${objectName}"`}
      size='lg'
    >
      <ObjectProperties objectDN={objectDN} objectName={objectName} objectType={objectType} />
    </Modal>
  );
}
