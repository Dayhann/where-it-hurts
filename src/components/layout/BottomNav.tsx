'use client';

import { ClipboardList, Home, Stethoscope, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * The reference design carries a four-tab bar (Home / Exercises / Progress /
 * Settings). Those screens do not exist here, and a bar of dead links is
 * worse than no bar, so the same treatment points at the destinations this
 * prototype actually has.
 */
const TABS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/checkin', label: 'Check-in', icon: ClipboardList },
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
          const isCheckin = href === '/checkin';
          const content = (
            <>
              <Icon aria-hidden className="size-5" />
              <span className="sr-only">{label}</span>
            </>
          );
          const className = cn(
            'flex size-[46px] items-center justify-center rounded-full',
            active
              ? 'button-raised text-primary-foreground'
              : 'text-strong hover:bg-foreground/5',
          );

          // /checkin only exists under a session id, so it is a label here
          // rather than a link to nowhere.
          return (
            <li key={href}>
              {isCheckin ? (
                <span
                  aria-current={active ? 'page' : undefined}
                  title={label}
                  className={cn(className, 'cursor-default')}
                >
                  {content}
                </span>
              ) : (
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  title={label}
                  className={cn(className, 'pressable')}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
