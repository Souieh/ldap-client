'use client';

import { ADComputerDetails } from '@/components/ad/ad-computer-details';
import { ADGroupDetails } from '@/components/ad/ad-group-details';
import { ADUserDetails } from '@/components/ad/ad-user-details';
import { Modal } from '@/components/ui/modal';

interface ObjectInfoProps {
  item: any;
}

interface ObjectInfoModalProps extends ObjectInfoProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ObjectInfo({ item }: ObjectInfoProps) {
  if (!item) return null;

  const isGroup = item.objectClass?.includes('group');
  const isComputer = item.objectClass?.includes('computer');
  const isUser = item.objectClass?.includes('user') && !isComputer;

  return (
    <div className='space-y-4 py-2'>
      {isGroup ? (
        <ADGroupDetails group={item} noContainer />
      ) : isComputer ? (
        <ADComputerDetails computer={item} noContainer />
      ) : isUser ? (
        <ADUserDetails user={item} noContainer />
      ) : (
        <div className='p-8 text-center border rounded-lg bg-muted/20'>
          <p className='text-muted-foreground italic'>
            No detailed view available for this object type.
          </p>
          <p className='text-xs mt-2 font-mono break-all'>{item.dn}</p>
        </div>
      )}
    </div>
  );
}

export function ObjectInfoModal({
  isOpen,
  onClose,
  item,
}: ObjectInfoModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${item?.displayName || item?.cn || 'Object'} Details`}
      description='Viewing Active Directory object details'
      size='lg'
    >
      <ObjectInfo item={item} />
    </Modal>
  );
}
