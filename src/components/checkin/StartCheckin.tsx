'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { patientCopy } from '@/components/i18n/patient';
import { LoadingButton } from '@/components/interior/loading-button';
import { TextReveal } from '@/components/interior/text-reveal';
import { buttonVariants } from '@/components/ui/button';
import FluidOrb from '@/components/ui/fluid-orb';
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
    <main className="flex flex-1 flex-col justify-center gap-7 py-4">
      <header className="flex flex-col gap-3">
        <FluidOrb size={160} color="#23636B" className="self-center" />
        <p className="text-sm font-medium tracking-wide text-primary uppercase">
          {copy.home.badge}
        </p>
        <h1 className="display-title text-3xl font-semibold tracking-tight">
          <TextReveal
            text={copy.home.title}
            by="character"
            className="text-foreground!"
          />
        </h1>
        <p>
          <TextReveal
            text={copy.home.description}
            by="word"
            className="text-foreground!"
          />
        </p>
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
        <LoadingButton
          onAction={start}
          pendingLabel={copy.home.starting}
          successLabel={copy.home.opening}
          errorLabel={copy.recap.retry}
          className="h-12! w-full rounded-lg! border-primary! bg-primary! text-lg! hover:bg-primary/85! [&>span>span]:text-primary-foreground!"
        >
          {copy.home.start}
        </LoadingButton>
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
