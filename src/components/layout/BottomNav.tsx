'use client';

import { Home, Stethoscope, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/** Demo destinations this prototype actually has. Check-in is session-bound, so it is not a tab. */
const TABS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/clinic', label: 'Clinic', icon: Stethoscope },
  { href: '/reception', label: 'Reception', icon: Users },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav
      aria-label="Sections"
      className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 mt-10 rounded-full bg-card/85 p-1.5 shadow-[var(--elevation-3)] backdrop-blur-md"
    >
      <ul className="flex items-center justify-between">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                title={label}
                className={cn(
                  'pressable flex size-[46px] items-center justify-center rounded-full',
                  active
                    ? 'button-raised text-primary-foreground'
                    : 'text-strong hover:bg-foreground/5',
                )}
              >
                <Icon aria-hidden className="size-5" />
                <span className="sr-only">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
