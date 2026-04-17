'use client';

import { ADUser } from '@/lib/types/config';
import { DynamicForm, FormField } from '@/components/forms/dynamic-form';

interface ADUserFormProps {
  values: Record<string, any>;
  onChange: (field: string, value: any) => void;
  onSubmit: (values: Record<string, any>) => void;
  isSubmitting?: boolean;
  isEditMode?: boolean;
}

export const userFields: FormField[] = [
  // Identity
  { name: 'givenName',    label: 'First name',     type: 'text', required: true,  group: 'Identity' },
  { name: 'sn',           label: 'Last name',      type: 'text', required: true,  group: 'Identity' },
  { name: 'displayName',  label: 'Display name',   type: 'text', required: true,  group: 'Identity' },
  { name: 'cn',           label: 'Common name',    type: 'text', required: true,  group: 'Identity' },
  { name: 'initials',     label: 'Initials',       type: 'text',                  group: 'Identity' },

  // Account
  { name: 'sAMAccountName',    label: 'Username (SAM)',   type: 'text',  required: true, group: 'Account' },
  { name: 'userPrincipalName', label: 'UPN',              type: 'text',                  group: 'Account' },
  { name: 'mail',              label: 'Email',            type: 'email',                 group: 'Account' },

  // Organization
  { name: 'title',       label: 'Title',       type: 'text', group: 'Organization' },
  { name: 'department',  label: 'Department',  type: 'text', group: 'Organization' },
  { name: 'company',     label: 'Company',     type: 'text', group: 'Organization' },
  { name: 'manager',     label: 'Manager DN',  type: 'text', group: 'Organization' },
  { name: 'employeeID',  label: 'Employee ID', type: 'text', group: 'Organization' },

  // Contact
  { name: 'telephoneNumber',          label: 'Phone',       type: 'text', group: 'Contact' },
  { name: 'mobile',                   label: 'Mobile',      type: 'text', group: 'Contact' },
  { name: 'facsimileTelephoneNumber', label: 'Fax',         type: 'text', group: 'Contact' },
  { name: 'physicalDeliveryOfficeName', label: 'Office',    type: 'text', group: 'Contact' },
  { name: 'wWWHomePage',              label: 'Website',     type: 'text', group: 'Contact' },

  // Address
  { name: 'streetAddress', label: 'Street',       type: 'text', group: 'Address' },
  { name: 'l',             label: 'City',         type: 'text', group: 'Address' },
  { name: 'st',            label: 'State',        type: 'text', group: 'Address' },
  { name: 'postalCode',    label: 'Postal code',  type: 'text', group: 'Address' },
  { name: 'co',            label: 'Country',      type: 'text', group: 'Address' },
];

export function ADUserForm({ values, onChange, onSubmit, isSubmitting = false, isEditMode = false }: ADUserFormProps) {
  return (
    <DynamicForm
      fields={userFields}
      values={values}
      onChange={onChange}
      onSubmit={onSubmit}
      submitLabel={isSubmitting ? 'Saving...' : isEditMode ? 'Update user' : 'Create user'}
      isSubmitting={isSubmitting}
      layout="grid"
    />
  );
}