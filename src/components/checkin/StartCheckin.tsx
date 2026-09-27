'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { patientCopy } from '@/components/i18n/patient';
import { LoadingButton } from '@/components/interior/loading-button';
import { buttonVariants } from '@/components/ui/button';
import { getApiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

export function StartCheckin() {
  const router = useRouter();
  const [carerMode, setCarerMode] = useState(false);
  const [error, setError] = useState(false);
  const copy = patientCopy('en');

  const start = async () => {
    setError(false);
    try {
      const { session } = await getApiClient().createSession({
        appointment: {
          patientDisplayName: 'Demo Patient',
          clinician: 'Dr Morgan Demo',
          startsAt: new Date().toISOString(),
        },
        lang: 'en',
        carerMode,
      });
      router.push(`/checkin/${session.id}`);
    } catch (cause) {
      setError(true);
      throw cause;
    }
  };

  return (
    <main className="flex flex-1 flex-col justify-center py-4 [&>*+*]:mt-10">
      {/* No decorative gradient, no character-by-character reveal. The
          heading is legible the instant the page paints — which matters
          when the reader is in pain — and the serif/sans contrast carries
          the tone instead. */}
      <header className="flex flex-col">
        <p className="eyebrow">{copy.home.badge}</p>
        <h1 className="display-title mt-5 text-[2.75rem] sm:text-[3.5rem]">
          {copy.home.title}
        </h1>
        <p className="measure body-copy mt-5 text-muted-foreground">
          {copy.home.description}
        </p>
      </header>

      <label className="flex min-h-14 cursor-pointer items-center gap-4 border-y border-border py-4 transition-colors hover:bg-muted/40">
        <input
          type="checkbox"
          checked={carerMode}
          onChange={(event) => setCarerMode(event.target.checked)}
          className="size-5 accent-primary"
        />
        <span className="text-base">{copy.home.carer}</span>
      </label>

      {error && (
        <p className="text-destructive" role="alert">
          {copy.home.error}
        </p>
      )}

      {/* The patient action is the only filled button on the page. The two
          demo entrances are visually demoted so the primary path is obvious
          at a glance. */}
      <nav className="flex flex-col gap-3" aria-label="Demo screens">
        <LoadingButton
          onAction={start}
          pendingLabel={copy.home.starting}
          successLabel={copy.home.opening}
          errorLabel={copy.recap.retry}
          className="h-14! w-full rounded-none! border-primary! bg-primary! text-base! tracking-[0.02em]! hover:bg-primary/90! [&>span>span]:text-primary-foreground!"
        >
          {copy.home.start}
        </LoadingButton>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Link
            href="/clinic"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'touch' }),
              'w-full',
            )}
          >
            {copy.home.clinic}
          </Link>
          <Link
            href="/reception"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'touch' }),
              'w-full',
            )}
          >
            {copy.home.reception}
          </Link>
        </div>
      </nav>

      <footer className="border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground [&>p+p]:mt-2">
        <p>
          {copy.home.prototype}{' '}
          <a
            className="font-medium text-foreground underline underline-offset-4"
            href="tel:000"
          >
            {copy.home.emergency}
          </a>
        </p>
        <p>
          {copy.home.credit}{' '}
          <a
            className="underline underline-offset-4"
            href="https://rareui.com"
            target="_blank"
            rel="noreferrer"
          >
            Rare UI
          </a>
          .
        </p>
      </footer>
    </main>
  );
}
