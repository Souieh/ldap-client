'use client';

import { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldGroup, FieldLabel } from '@/components/ui/field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select';
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: any;
  help?: string;
  group?: string;
  fullWidth?: boolean;
  render?: (value: any, onChange: (value: any) => void, field: FormField) => ReactNode;
}

export interface DynamicFormProps {
  fields: FormField[];
  values: Record<string, any>;
  onChange: (field: string, value: any) => void;
  onSubmit?: (values: Record<string, any>) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  layout?: 'vertical' | 'grid';
  useTabs?: boolean;
}

export function DynamicForm({
  fields,
  values,
  onChange,
  onSubmit,
  submitLabel = 'Submit',
  isSubmitting = false,
  layout = 'vertical',
  useTabs = true,
}: DynamicFormProps) {
  const handleChange = (fieldName: string, value: any) => onChange(fieldName, value);

  const renderField = (field: FormField) => {
    const value = values[field.name] ?? field.defaultValue ?? '';

    if (field.render) {
      return field.render(value, (val) => handleChange(field.name, val), field);
    }

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled}
            rows={3}
          />
        );

      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(val) => handleChange(field.name, val)}
            disabled={field.disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) =>
              handleChange(field.name, e.target.value ? Number(e.target.value) : '')
            }
            placeholder={field.placeholder}
            disabled={field.disabled}
          />
        );

      default:
        return (
          <Input
            type={field.type}
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled}
          />
        );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(values);
  };

  const grouped: { label: string; fields: FormField[] }[] = [];
  const seen = new Map<string, number>();

  for (const field of fields) {
    const key = field.group ?? 'General';
    if (!seen.has(key)) {
      seen.set(key, grouped.length);
      grouped.push({ label: key, fields: [] });
    }
    grouped[seen.get(key)!].fields.push(field);
  }

  const invalidTabs = new Set(
    grouped
      .filter((section) =>
        section.fields.some((f) => f.required && !values[f.name] && !f.defaultValue)
      )
      .map((s) => s.label)
  );

  const renderSection = (sectionFields: FormField[]) => (
    <div className={layout === 'grid' ? 'grid grid-cols-2 gap-x-4 gap-y-3' : 'flex flex-col gap-3'}>
      {sectionFields.map((field) => (
        <FieldGroup
          key={field.name}
          className={`mt-4 ${field.fullWidth || layout === 'vertical' ? 'col-span-2' : ''}`}
        >
          <FieldLabel>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </FieldLabel>
          {renderField(field)}
          {field.help && (
            <p className="text-xs text-muted-foreground mt-1">{field.help}</p>
          )}
        </FieldGroup>
      ))}
    </div>
  );

  if (grouped.length <= 1) {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        {renderSection(grouped[0]?.fields ?? fields)}
        {onSubmit && (
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Saving...' : submitLabel}
            </button>
          </div>
        )}
      </form>
    );
  }

  if (!useTabs) {
    return (
      <form onSubmit={handleSubmit} className="space-y-8 max-h-[600px] overflow-y-auto px-1 custom-scrollbar">
        {grouped.map((section) => (
          <div key={section.label} className="space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b pb-2">
              {section.label}
            </h3>
            {renderSection(section.fields)}
          </div>
        ))}
        {onSubmit && (
          <div className="pt-4 sticky bottom-0 bg-background/80 backdrop-blur-sm border-t border-border py-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
            >
              {isSubmitting ? 'Saving...' : submitLabel}
            </button>
          </div>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue={grouped[0].label}>
        <TabsList >
          {grouped.map((section) => (
            <TabsTrigger
              key={section.label}
              value={section.label}
             >
              {section.label}
              {invalidTabs.has(section.label) && (
                <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {grouped.map((section) => (
          <TabsContent key={section.label} value={section.label} className="mt-4 focus-visible:outline-none">
            {renderSection(section.fields)}
          </TabsContent>
        ))}
      </Tabs>

      {onSubmit && (
        <div className="pt-2 border-t border-border">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}
