'use client';

import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UI_LABELS } from '@/lib/constants/ui-labels';
import { BarChart3, Check, Network, Settings } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const features = [
    {
      icon: BarChart3,
      title: 'AD Management',
      description: 'Manage users, computers, groups, and organizational units with ease.',
      href: '/ad-management',
      color: 'text-blue-600',
    },
    {
      icon: Network,
      title: 'DNS Manager',
      description: 'Handle all DNS record types with a clean, intuitive interface.',
      href: '/dns-manager',
      color: 'text-purple-600',
    },
    {
      icon: Settings,
      title: 'Configuration',
      description: 'Set up and manage multiple LDAP connection profiles.',
      href: '/setup',
      color: 'text-green-600',
    },
  ];

  const capabilities = [
    'Multi-profile LDAP configuration support',
    'OU-based object browsing and management',
    'Rich filtering and search capabilities',
    'Support for all DNS record types',
    'Detailed object property editing',
    'User-friendly, modern interface',
  ];

  return (
    <>
      <Header />
      <main className='min-h-screen'>
        {/* Hero Section */}
        <section className='py-20 px-4 bg-linear-to-br from-primary/5 via-background to-background border-b border-border'>
          <div className='container mx-auto max-w-4xl text-center'>
            <div className='flex items-center justify-center gap-3 mb-6'>
              <Network className='h-12 w-12 text-primary' />
            </div>
            <h1 className='text-5xl font-bold mb-6 text-balance'>{UI_LABELS.app.title}</h1>
            <p className='text-xl text-muted-foreground mb-8 text-balance'>
              A modern, powerful LDAPilot for managing Samba4 Directory Services
            </p>
            <div className='flex gap-4 justify-center flex-wrap'>
              <Link href='/ad-management'>
                <Button size='lg' className='gap-2'>
                  Get Started
                </Button>
              </Link>
              <Link href='/setup'>
                <Button variant='outline' size='lg'>
                  Configure Connection
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className='py-16 px-4'>
          <div className='container mx-auto max-w-4xl'>
            <h2 className='text-3xl font-bold mb-12 text-center'>Features</h2>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Link key={feature.href} href={feature.href}>
                    <Card className='h-full hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer'>
                      <CardHeader>
                        <Icon className={`h-10 w-10 mb-4 ${feature.color}`} />
                        <CardTitle>{feature.title}</CardTitle>
                        <CardDescription>{feature.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Capabilities Section */}
        <section className='py-16 px-4 bg-muted/50 border-y border-border'>
          <div className='container mx-auto max-w-4xl'>
            <h2 className='text-3xl font-bold mb-12 text-center'>Capabilities</h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {capabilities.map((capability, idx) => (
                <div key={idx} className='flex gap-3'>
                  <Check className='h-5 w-5 text-green-600 flex-shrink-0 mt-0.5' />
                  <span className='text-foreground'>{capability}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Getting Started Section */}
        <section className='py-16 px-4'>
          <div className='container mx-auto max-w-4xl'>
            <h2 className='text-3xl font-bold mb-8 text-center'>Getting Started</h2>
            <Card>
              <CardContent className='pt-6'>
                <div className='space-y-4'>
                  <div className='flex gap-4'>
                    <div className='flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold'>
                      1
                    </div>
                    <div>
                      <h3 className='font-semibold mb-2'>Configure LDAP Connection</h3>
                      <p className='text-muted-foreground'>
                        Go to Settings and create a new LDAP profile with your Samba4 DC details.
                        Test the connection to ensure everything works.
                      </p>
                    </div>
                  </div>
                  <div className='flex gap-4'>
                    <div className='flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold'>
                      2
                    </div>
                    <div>
                      <h3 className='font-semibold mb-2'>Browse Directory Structure</h3>
                      <p className='text-muted-foreground'>
                        Navigate to AD Management to view organizational units and manage users,
                        computers, and groups.
                      </p>
                    </div>
                  </div>
                  <div className='flex gap-4'>
                    <div className='flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold'>
                      3
                    </div>
                    <div>
                      <h3 className='font-semibold mb-2'>Manage DNS Records</h3>
                      <p className='text-muted-foreground'>
                        Use the DNS Manager to add, edit, and delete DNS records for your zones with
                        full support for all record types.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className='py-16 px-4 bg-primary/10 border-y border-border'>
          <div className='container mx-auto max-w-2xl text-center'>
            <h2 className='text-3xl font-bold mb-4'>Ready to Get Started?</h2>
            <p className='text-muted-foreground mb-8'>
              Configure your first LDAP connection and start managing your directory.
            </p>
            <Link href='/setup'>
              <Button size='lg' className='gap-2'>
                <Settings className='h-5 w-5' />
                Go to Settings
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
