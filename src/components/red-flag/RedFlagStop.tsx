'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function RedFlagStop() {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background px-6">
      <main
        role="alert"
        aria-live="assertive"
        aria-labelledby="red-flag-heading"
        className="flex w-full max-w-md flex-col gap-6"
      >
        <h1
          ref={headingRef}
          id="red-flag-heading"
          tabIndex={-1}
          className="text-2xl font-semibold tracking-tight"
        >
          Please call 000 or go to your nearest emergency department now.
        </h1>
        <p className="text-lg leading-7">Your clinic has been notified.</p>
        <a
          href="tel:000"
          className={cn(buttonVariants({ size: 'touch' }), 'text-lg')}
        >
          Call 000
        </a>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'touch' }),
            'text-lg text-muted-foreground',
          )}
        >
          Return to start
        </Link>
      </main>
    </div>
  );
}
