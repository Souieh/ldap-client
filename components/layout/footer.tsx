import { Github } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className='w-full border-t border-border bg-background py-6'>
      <div className='container mx-auto px-4 flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row'>
        <p className='text-sm text-muted-foreground'>
          &copy; {new Date().getFullYear()} LDAPilot. Built for Samba4.
        </p>
        <div className='flex items-center gap-4'>
          <Link
            href='https://github.com/Souieh/ldap-client.git'
            target='_blank'
            rel='noreferrer'
            className='flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors'
          >
            <Github className='h-5 w-5' />
            <span>Source Code</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
