'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { isAccountEnabled } from '@/lib/constants/ldap-attributes';
import { AlertCircle, KeyRound, UserCheck, UserX, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ObjectAccountProps {
  item: any;
  onSuccess?: () => void;
}

export function ObjectAccount({ item, onSuccess }: ObjectAccountProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (!item) return null;

  const enabled = isAccountEnabled(item.userAccountControl);
  const type = item.objectClass?.includes('computer') ? 'Computer' : 'User';

  const handleToggleStatus = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/ldap/objects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dn: item.dn,
          action: 'toggle-status',
          payload: { enabled: !enabled },
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || `Failed to ${enabled ? 'disable' : 'enable'} account`);
      }

      toast.success(`Account ${enabled ? 'disabled' : 'enabled'} successfully`);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/ldap/objects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dn: item.dn,
          action: 'password',
          payload: { newPassword },
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update password');
      }

      toast.success('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='space-y-8 py-4 px-2'>
      {/* Account Status Section */}
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <div>
            <h3 className='text-sm font-semibold'>Account Status</h3>
            <p className='text-xs text-muted-foreground'>
              Enable or disable this {type.toLowerCase()} account.
            </p>
          </div>
          <Button
            variant={enabled ? 'destructive' : 'default'}
            onClick={handleToggleStatus}
            disabled={isSubmitting}
            className='gap-2'
          >
            {isSubmitting ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : enabled ? (
              <UserX className='h-4 w-4' />
            ) : (
              <UserCheck className='h-4 w-4' />
            )}
            {enabled ? 'Disable Account' : 'Enable Account'}
          </Button>
        </div>

        <div
          className={`flex items-start gap-3 p-4 rounded-md border ${
            enabled
              ? 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-900/20'
              : 'bg-destructive/10 border-destructive/20'
          }`}
        >
          {enabled ? (
            <UserCheck className='h-5 w-5 text-green-600 shrink-0 mt-0.5' />
          ) : (
            <UserX className='h-5 w-5 text-destructive shrink-0 mt-0.5' />
          )}
          <div className='space-y-1'>
            <p
              className={`text-sm font-medium ${enabled ? 'text-green-800 dark:text-green-400' : 'text-destructive'}`}
            >
              Account is currently {enabled ? 'Enabled' : 'Disabled'}
            </p>
            <p
              className={`text-xs ${enabled ? 'text-green-700/80 dark:text-green-500/80' : 'text-destructive/80'}`}
            >
              {enabled
                ? `This ${type.toLowerCase()} can log in and access domain resources.`
                : `This ${type.toLowerCase()} is prevented from logging in.`}
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Password Reset Section */}
      <div className='space-y-4'>
        <div>
          <h3 className='text-sm font-semibold'>Reset Password</h3>
          <p className='text-xs text-muted-foreground'>
            Set a new password for this {type.toLowerCase()} account.
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className='space-y-4'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='newPassword'>New Password</Label>
              <div className='relative'>
                <KeyRound className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  id='newPassword'
                  type='password'
                  placeholder='Enter new password'
                  className='pl-10'
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='confirmPassword'>Confirm Password</Label>
              <div className='relative'>
                <KeyRound className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  id='confirmPassword'
                  type='password'
                  placeholder='Confirm new password'
                  className='pl-10'
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className='flex justify-end'>
            <Button
              type='submit'
              disabled={isSubmitting || !newPassword || newPassword !== confirmPassword}
              className='gap-2'
            >
              {isSubmitting && <Loader2 className='h-4 w-4 animate-spin' />}
              Update Password
            </Button>
          </div>
        </form>

        <div className='flex items-start gap-3 p-4 bg-muted/50 border border-border rounded-md'>
          <AlertCircle className='h-5 w-5 text-muted-foreground shrink-0 mt-0.5' />
          <p className='text-xs text-muted-foreground leading-relaxed'>
            Resetting the password will take effect immediately. Ensure the new password meets the
            domain's complexity requirements.
          </p>
        </div>
      </div>
    </div>
  );
}
