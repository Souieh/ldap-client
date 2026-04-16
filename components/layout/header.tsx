'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UI_LABELS } from '@/lib/constants/ui-labels';
import { LogOut, Menu, Network, Settings, User, X } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function Header() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [session, setSession] = useState<{
    authenticated: boolean;
    user?: { username: string };
    profile?: { name: string };
  } | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          setSession(data);
        }
      } catch (error) {
        console.error('Failed to fetch session');
      }
    };
    fetchSession();
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (error) {
      console.error('Logout failed');
    }
  };

  const navItems = [
    { label: UI_LABELS.navigation.dashboard, href: '/dashboard' },
    { label: UI_LABELS.navigation.adManagement, href: '/ad-management' },
    { label: UI_LABELS.navigation.dnsManager, href: '/dns-manager' },
  ];

  return (
    <header className='sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <div className='container mx-auto flex h-16 items-center justify-between px-4'>
        {/* Logo */}
        <Link href='/' className='flex items-center gap-2 font-bold text-lg'>
          <Network className='h-6 w-6 text-primary' />
          <span className='hidden sm:inline'>{UI_LABELS.app.title}</span>
        </Link>

        {/* Desktop Navigation */}
        {session?.authenticated && (
          <nav className='hidden md:flex items-center gap-1'>
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button variant='ghost' className='text-foreground hover:bg-muted'>
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>
        )}

        {/* Right Actions */}
        <div className='flex items-center gap-2'>
          <ThemeToggle />
          {session?.authenticated && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' className='gap-2 px-2'>
                  <div className='h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center'>
                    <User className='h-4 w-4 text-primary' />
                  </div>
                  <div className='hidden lg:flex flex-col items-start text-xs'>
                    <span className='font-semibold'>{session.user?.username}</span>
                    <span className='text-muted-foreground'>{session.profile?.name}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-56'>
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href='/setup'>
                    <Settings className='h-4 w-4 mr-2' />
                    {UI_LABELS.navigation.settings}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className='text-destructive focus:text-destructive'
                >
                  <LogOut className='h-4 w-4 mr-2' />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {!session?.authenticated && (
            <Link href='/login'>
              <Button>Get Started</Button>
            </Link>
          )}

          {/* Mobile Menu Button */}
          {session?.authenticated && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className='md:hidden p-2 hover:bg-muted rounded-md'
            >
              {mobileMenuOpen ? <X className='h-5 w-5' /> : <Menu className='h-5 w-5' />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className='md:hidden border-t border-border bg-muted/50'>
          <nav className='container mx-auto px-4 py-4 flex flex-col gap-2'>
            {session?.authenticated &&
              navItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant='ghost' className='w-full justify-start'>
                    {item.label}
                  </Button>
                </Link>
              ))}
          </nav>
        </div>
      )}
    </header>
  );
}
