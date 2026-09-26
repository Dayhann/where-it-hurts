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
        'flex min-h-full flex-1 justify-center px-4 py-6',
        patient ? 'text-[18px] leading-7' : 'text-base leading-6',
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
