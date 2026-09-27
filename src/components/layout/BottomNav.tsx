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
      className="sticky bottom-0 z-20 -mx-5 mt-10 border-t border-track bg-card/95 px-5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:-mx-8 sm:px-8"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          const isCheckin = href === '/checkin';
          const content = (
            <>
              <span
                className={cn(
                  'flex size-[38px] items-center justify-center rounded-full transition-shadow',
                  active ? 'button-raised-soft text-primary' : 'text-strong',
                )}
              >
                <Icon aria-hidden className="size-5" />
              </span>
              <span className="type-body">{label}</span>
            </>
          );
          const className = cn(
            'flex min-h-16 min-w-16 flex-col items-center justify-center gap-0.5 rounded-xl px-2 transition-colors',
            active
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          );

          // /checkin only exists under a session id, so it is a label here
          // rather than a link to nowhere.
          return (
            <li key={href}>
              {isCheckin ? (
                <span
                  aria-current={active ? 'page' : undefined}
                  className={cn(className, 'cursor-default')}
                >
                  {content}
                </span>
              ) : (
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={className}
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
