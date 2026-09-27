import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageShellProps = {
  children: ReactNode;
  /** Patient check-in: 18px type, phone-width column. Clinic: full width. */
  variant?: 'patient' | 'clinic';
};

export function PageShell({ children, variant = 'patient' }: PageShellProps) {
  const patient = variant === 'patient';

  return (
    <div
      className={cn(
        // Generous, responsive gutters on an 8px grid. The old flat px-4 py-6
        // left content touching the edge of a phone and cramped on desktop.
        'flex min-h-full flex-1 justify-center',
        'px-5 py-8 sm:px-8 sm:py-12 lg:py-16',
        patient ? 'text-[18px] leading-[1.65]' : 'text-base leading-relaxed',
      )}
    >
      <div
        className={cn(
          'flex w-full flex-1 flex-col',
          patient ? 'max-w-md' : 'max-w-6xl',
        )}
      >
        {children}
      </div>
    </div>
  );
}
