'use client';

import { DynamicForm, FormField } from '@/components/forms/dynamic-form';

interface ADGroupFormProps {
  values: Record<string, any>;
  onChange: (field: string, value: any) => void;
  onSubmit: (values: Record<string, any>) => void;
  isSubmitting?: boolean;
  isEditMode?: boolean;
}

export const groupFields: FormField[] = [
  // General
  { name: 'cn',             label: 'Group name',      type: 'text',     required: true, group: 'General' },
  { name: 'sAMAccountName', label: 'SAM account',     type: 'text',     required: true, group: 'General' },
  { name: 'displayName',    label: 'Display name',    type: 'text',                     group: 'General' },
  { name: 'mail',           label: 'Email',           type: 'email',                    group: 'General' },
  { name: 'description',    label: 'Description',     type: 'textarea', fullWidth: true, group: 'General' },

  // Settings
  {
    name: 'groupType',
    label: 'Group type',
    type: 'select',
    group: 'Settings',
    options: [
      { value: '-2147483646', label: 'Global security' },
      { value: '-2147483644', label: 'Domain local security' },
      { value: '-2147483640', label: 'Universal security' },
      { value: '2',           label: 'Global distribution' },
      { value: '4',           label: 'Domain local distribution' },
      { value: '8',           label: 'Universal distribution' },
    ],
  },
  { name: 'managedBy', label: 'Managed by (DN)', type: 'text', fullWidth: true, group: 'Settings' },
  { name: 'info',      label: 'Notes',           type: 'textarea', fullWidth: true, group: 'Settings' },
];

export function ADGroupForm({ values, onChange, onSubmit, isSubmitting = false, isEditMode = false }: ADGroupFormProps) {
  return (
    <DynamicForm
      fields={groupFields}
      values={values}
      onChange={onChange}
      onSubmit={onSubmit}
      submitLabel={isEditMode ? 'Update group' : 'Create group'}
      isSubmitting={isSubmitting}
      layout="grid"
    />
  );
}