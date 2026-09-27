import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AppHeader } from './AppHeader';
import { BottomNav } from './BottomNav';

type PageShellProps = {
  children: ReactNode;
  /** Patient check-in: 18px type, phone-width column. Clinic: full width. */
  variant?: 'patient' | 'clinic';
  /** Patient pages carry the masthead and tab bar; the clinic does not. */
  chrome?: boolean;
};

export function PageShell({
  children,
  variant = 'patient',
  chrome = true,
}: PageShellProps) {
  const patient = variant === 'patient';
  const withChrome = patient && chrome;

  return (
    <div
      className={cn(
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
        {withChrome && <AppHeader />}
        <div className={cn('flex flex-1 flex-col', withChrome && 'pt-2 pb-6')}>
          {children}
        </div>
        {withChrome && <BottomNav />}
      </div>
    </div>
  );
}
