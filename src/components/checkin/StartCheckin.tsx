'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { patientCopy } from '@/components/i18n/patient';
import { buttonVariants } from '@/components/ui/button';
import { getApiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

export function StartCheckin() {
  const router = useRouter();
  const [carerMode, setCarerMode] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(false);
  const copy = patientCopy('en');

  const start = async () => {
    setStarting(true);
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
    } catch {
      setError(true);
      setStarting(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col justify-center gap-7 py-4">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium tracking-wide text-primary uppercase">
          {copy.home.badge}
        </p>
        <h1 className="display-title text-3xl font-semibold tracking-tight">
          {copy.home.title}
        </h1>
        <p>{copy.home.description}</p>
      </header>

      <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <input
          type="checkbox"
          checked={carerMode}
          onChange={(event) => setCarerMode(event.target.checked)}
          className="size-5 accent-primary"
        />
        <span>{copy.home.carer}</span>
      </label>

      {error && (
        <p className="text-destructive" role="alert">
          {copy.home.error}
        </p>
      )}

      <nav className="flex flex-col gap-3" aria-label="Demo screens">
        <button
          type="button"
          disabled={starting}
          onClick={() => void start()}
          className={cn(buttonVariants({ size: 'touch' }), 'w-full text-lg')}
        >
          {starting ? copy.home.starting : copy.home.start}
        </button>
        <Link
          href="/clinic"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'touch' }),
            'w-full text-lg',
          )}
        >
          {copy.home.clinic}
        </Link>
        <Link
          href="/reception"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'touch' }),
            'w-full text-lg',
          )}
        >
          {copy.home.reception}
        </Link>
      </nav>

      <p className="text-sm leading-6 text-muted-foreground">
        {copy.home.prototype}{' '}
        <a className="underline underline-offset-2" href="tel:000">
          {copy.home.emergency}
        </a>
      </p>
      <p className="text-sm leading-6 text-muted-foreground">
        {copy.home.credit}{' '}
        <a
          className="underline underline-offset-2"
          href="https://rareui.com"
          target="_blank"
          rel="noreferrer"
        >
          Rare UI
        </a>
        .
      </p>
    </main>
  );
}
