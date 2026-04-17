'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { ADOU } from '@/lib/types/config';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MoveObjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  dn: string;
  name: string;
  ous: ADOU[];
  onSuccess: (newDN?: string) => Promise<void> | void;
}

export function MoveObjectModal({ isOpen, onClose, dn, name, ous, onSuccess }: MoveObjectModalProps) {
  const [newOU, setNewOU] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMove = async () => {
    if (!newOU) return;
    try {
      setIsSubmitting(true);
      const password = sessionStorage.getItem('ldap-password') || '';
      const res = await fetch('/api/ldap/objects', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-ldap-password': password 
        },
        body: JSON.stringify({ dn, action: 'move', payload: { newOU } }),
      });

      if (!res.ok) throw new Error('Failed to move object');
      const data = await res.json();
      
      toast.success(`Moved ${name} successfully`);
      await onSuccess(data.newDN);
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Move Object"
      description={`Select a new destination for ${name}`}
      actions={[{ label: 'Move', onClick: handleMove, disabled: isSubmitting || !newOU }]}
    >
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Destination OU</label>
          <Select onValueChange={setNewOU} value={newOU}>
            <SelectTrigger>
              <SelectValue placeholder="Select target OU..." />
            </SelectTrigger>
            <SelectContent>
              {ous.map((ou) => (
                <SelectItem key={ou.dn} value={ou.dn}>
                  {ou.ou || ou.dn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Modal>
  );
}