'use client';

import { DynamicForm, FormField } from '@/components/forms/dynamic-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { UI_LABELS } from '@/lib/constants/ui-labels';
import { ConfigProfile, LDAPConfig } from '@/lib/types/config';
import { Check, Plus, Settings, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ConfigProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ConfigProfile | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/config/profiles');
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      }
    } catch (error) {
      toast.error('Failed to load profiles');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewProfile = () => {
    setEditingProfile(null);
    setFormValues({
      name: '',
      hostname: '',
      port: 389,
      protocol: 'ldap',
      domain: '',
      baseDN: '',
      caCert: '',
      disableTlsVerification: false,
    });
    setShowModal(true);
  };

  const handleEditProfile = (profile: ConfigProfile) => {
    setEditingProfile(profile);
    setFormValues({
      name: profile.name,
      hostname: profile.config.hostname,
      port: profile.config.port,
      protocol: profile.config.protocol,
      domain: profile.config.domain,
      baseDN: profile.config.baseDN || '',
      caCert: profile.config.ca || '',
      disableTlsVerification: profile.config.disableTlsVerification || false,
    });
    setShowModal(true);
  };

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      // Prompt for password since it's not stored
      const username = prompt('Enter LDAP username:');
      const password = prompt('Enter LDAP password:');
      if (!username) return;
      if (!password) return;

      const res = await fetch('/api/ldap/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostname: formValues.hostname,
          username: username,
          port: formValues.port,
          protocol: formValues.protocol,
          caCert: formValues.caCert,
          password,
          domain: formValues.domain,
          baseDN: formValues.baseDN,
          disableTlsVerification: formValues.disableTlsVerification,
        }),
      });

      if (res.ok) {
        toast.success(UI_LABELS.messages.connectionSuccess);
      } else {
        const error = await res.json();
        toast.error(error.error || UI_LABELS.messages.connectionFailed);
      }
    } catch (error) {
      toast.error(UI_LABELS.messages.connectionFailed);
      console.error(error);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (!formValues.name || !formValues.hostname || !formValues.domain) {
        toast.error('Please fill in required fields');
        return;
      }

      const config: Omit<LDAPConfig, 'id' | 'created' | 'modified'> = {
        name: formValues.name,
        hostname: formValues.hostname,
        port: parseInt(formValues.port),
        protocol: formValues.protocol,
        domain: formValues.domain,
        baseDN: formValues.baseDN,
        ca: formValues.caCert || undefined,
        disableTlsVerification: !!formValues.disableTlsVerification,
      };

      let res;
      if (editingProfile) {
        res = await fetch(`/api/config/profiles/${editingProfile.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formValues.name,
            config,
          }),
        });
      } else {
        res = await fetch('/api/config/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formValues.name,
            config,
          }),
        });
      }

      if (res.ok) {
        toast.success(UI_LABELS.messages.saved);
        setShowModal(false);
        loadProfiles();
      } else {
        toast.error('Failed to save profile');
      }
    } catch (error) {
      toast.error('Error saving profile');
      console.error(error);
    }
  };

  const handleSetActive = async (profileId: string) => {
    try {
      const res = await fetch('/api/config/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });

      if (res.ok) {
        loadProfiles();
        toast.success('Profile activated');
      } else {
        toast.error('Failed to activate profile');
      }
    } catch (error) {
      toast.error('Error activating profile');
      console.error(error);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;

    try {
      const res = await fetch(`/api/config/profiles/${profileId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success(UI_LABELS.messages.deleted);
        loadProfiles();
      } else {
        toast.error('Failed to delete profile');
      }
    } catch (error) {
      toast.error('Error deleting profile');
      console.error(error);
    }
  };

  const handleSelectProfile = async (profileId: string) => {
    try {
      const res = await fetch('/api/config/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });

      if (res.ok) {
        toast.success('Profile selected');
        router.push('/login');
      } else {
        toast.error('Failed to select profile');
      }
    } catch (error) {
      toast.error('Error selecting profile');
      console.error(error);
    }
  };

  const formFields: FormField[] = [
    {
      name: 'name',
      label: 'Profile Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Production DC',
    },
    {
      name: 'hostname',
      label: UI_LABELS.config.hostname,
      type: 'text',
      required: true,
      placeholder: 'dc.example.com',
    },
    {
      name: 'port',
      label: UI_LABELS.config.port,
      type: 'number',
      defaultValue: 389,
    },
    {
      name: 'protocol',
      label: UI_LABELS.config.protocol,
      type: 'select',
      options: [
        { value: 'ldap', label: 'LDAP (389)' },
        { value: 'ldaps', label: 'LDAPS (636)' },
      ],
    },
    {
      name: 'domain',
      label: UI_LABELS.config.domain,
      type: 'text',
      required: true,
      placeholder: 'example.com',
    },
    {
      name: 'baseDN',
      label: 'Base DN (Auto-generated)',
      type: 'text',
      disabled: true,
      placeholder: 'dc=example,dc=com',
    },
    {
      name: 'disableTlsVerification',
      label: 'Disable TLS Verification',
      type: 'select',
      options: [
        { value: 'false', label: 'Enabled (Secure)' },
        { value: 'true', label: 'Disabled (Insecure)' },
      ],
      defaultValue: 'true',
      help: 'Ignore certificate validation errors. Useful for self-signed certificates or internal testing.',
    },
    {
      name: 'caCert',
      label: 'CA Certificate (PEM)',
      type: 'textarea',
      placeholder: '-----BEGIN CERTIFICATE-----\n...',
      help: 'Required for LDAPS if your server uses a self-signed certificate.',
    },
  ];

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-muted/30'>
        <p className='text-muted-foreground animate-pulse'>Loading...</p>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-muted/30 p-4'>
      <Card className='w-full max-w-4xl shadow-xl border-t-4 border-t-primary'>
        <CardHeader className='text-center space-y-1'>
          <div className='flex justify-center mb-4'>
            <div className='p-3 bg-primary/10 rounded-full'>
              <Settings className='h-10 w-10 text-primary' />
            </div>
          </div>
          <CardTitle className='text-2xl font-bold'>{UI_LABELS.config.title}</CardTitle>
          <CardDescription>Manage your LDAP connection profiles</CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-xl font-semibold'>Connection Profiles</h2>
              <p className='text-muted-foreground text-sm mt-1'>
                Configure and manage your LDAP server connections
              </p>
            </div>
            <Button onClick={handleNewProfile} className='gap-2'>
              <Plus className='h-4 w-4' />
              {UI_LABELS.config.newProfile}
            </Button>
          </div>

          {profiles.length === 0 ? (
            <Card className='border-dashed'>
              <CardContent className='pt-6'>
                <p className='text-center text-muted-foreground py-8'>
                  No profiles created yet. Create one to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {profiles.map((profile) => (
                <Card key={profile.id} className='relative'>
                  {profile.isActive && (
                    <div className='absolute top-4 right-4'>
                      <span className='inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium'>
                        <Check className='h-3 w-3' />
                        Active
                      </span>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className='text-lg'>{profile.name}</CardTitle>
                    <CardDescription>
                      {profile.config.hostname}:{profile.config.port}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-3 mb-4'>
                      <div>
                        <p className='text-sm text-muted-foreground'>Protocol</p>
                        <p className='font-medium'>{profile.config.protocol}</p>
                      </div>
                      <div>
                        <p className='text-sm text-muted-foreground'>Domain</p>
                        <p className='font-medium'>{profile.config.domain}</p>
                      </div>
                      {profile.config.disableTlsVerification && (
                        <div>
                          <p className='text-sm text-amber-600 font-medium italic'>
                            TLS Verification Disabled
                          </p>
                        </div>
                      )}
                    </div>
                    <div className='flex flex-col gap-2'>
                      <Button onClick={() => handleSelectProfile(profile.id)} className='w-full'>
                        Select Profile
                      </Button>
                      {!profile.isActive && (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleSetActive(profile.id)}
                          className='w-full'
                        >
                          Set as Active
                        </Button>
                      )}
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handleEditProfile(profile)}
                        className='w-full'
                      >
                        Edit
                      </Button>
                      <Button
                        variant='destructive'
                        size='sm'
                        onClick={() => handleDeleteProfile(profile.id)}
                        className='w-full'
                      >
                        <Trash2 className='h-4 w-4 mr-2' />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProfile ? 'Edit Profile' : 'New LDAP Profile'}
        size='lg'
        actions={[
          {
            label: UI_LABELS.config.testConnection,
            onClick: handleTestConnection,
            variant: 'outline',
            disabled: testingConnection || !formValues.hostname,
          },
          {
            label: UI_LABELS.actions.save,
            onClick: handleSaveProfile,
            disabled: !formValues.name || !formValues.hostname || !formValues.domain,
          },
        ]}
      >
        <DynamicForm
          fields={formFields}
          values={formValues}
          onChange={(field, value) => {
            setFormValues((prev) => {
              const updated = { ...prev, [field]: value };
              if (field === 'domain' && value) {
                updated.baseDN = value
                  .split('.')
                  .map((p: string) => `dc=${p.trim()}`)
                  .join(',');
              }
              return updated;
            });
          }}
        />
      </Modal>
    </div>
  );
}
