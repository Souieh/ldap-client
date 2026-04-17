'use client';

import { groupFields } from '@/components/ad/ad-group-form';
import { userFields } from '@/components/ad/ad-user-form';
import { DynamicForm, FormField } from '@/components/forms/dynamic-form';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface ObjectEditProps {
  item: any;
  onSuccess?: () => void;
  group?: string;
}

export function ObjectEdit({ item, onSuccess, group }: ObjectEditProps) {
  const [values, setValues] = useState<Record<string, any>>(item || {});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setValues(item);
    }
  }, [item]);

  if (!item) return null;

  const isGroup = item.objectClass?.includes('group');
  const isComputer = item.objectClass?.includes('computer');
  const isUser = item.objectClass?.includes('user') && !isComputer;

  const handleChange = (field: string, value: any) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (formValues: Record<string, any>) => {
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/ldap/objects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dn: item.dn,
          action: 'update',
          payload: {
            attributes: formValues,
          },
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update object');
      }

      toast.success('Object updated successfully');
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error updating object');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fields = isUser ? userFields : isGroup ? groupFields : [];
  const filteredFields = group
    ? fields.filter(f => (f.group || 'General') === group)
    : fields;

  if (filteredFields.length === 0) {
    return (
      <div className='p-8 text-center border rounded-lg bg-muted/20'>
        <p className='text-muted-foreground italic'>
          No editable fields available for this section.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-4 py-2'>
      <DynamicForm
        fields={filteredFields}
        values={values}
        onChange={handleChange}
        onSubmit={handleSubmit}
        submitLabel='Update All Properties'
        isSubmitting={isSubmitting}
        layout='grid'
        useTabs={false}
      />
    </div>
  );
}
