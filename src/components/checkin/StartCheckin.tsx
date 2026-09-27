'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { patientCopy } from '@/components/i18n/patient';
import { LoadingButton } from '@/components/interior/loading-button';
import { FigureMark } from '@/components/layout/FigureMark';
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
    <main className="flex flex-1 flex-col py-2 [&>*+*]:mt-7">
      <header className="flex flex-col">
        <p className="text-base text-muted-foreground">{copy.home.greeting}</p>
        <h1 className="display-title mt-1 text-[2.125rem]">
          {copy.home.title}
        </h1>
      </header>

      {/* Step card: numbered badge, step name, serif heading, body copy and
          a figure thumbnail that doubles as the affordance into the flow. */}
      <section className="surface">
        <div className="flex items-start gap-5">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
              >
                1
              </span>
              <span className="text-sm font-medium">{copy.home.stepName}</span>
            </div>
            <h2 className="display-title mt-3 text-[1.625rem]">
              {copy.home.stepTitle}
            </h2>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-muted-foreground">
              {copy.home.description}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-3 pt-1">
            <FigureMark className="h-24 w-14 text-muted-foreground/70" />
          </div>
        </div>
      </section>

      <label className="card-row cursor-pointer py-3 transition-colors hover:bg-muted/40">
        <input
          type="checkbox"
          checked={carerMode}
          onChange={(event) => setCarerMode(event.target.checked)}
          className="size-5 accent-primary"
        />
        <span className="text-[0.9375rem]">{copy.home.carer}</span>
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
          className="h-14! w-full rounded-2xl! border-primary! bg-primary! text-base! hover:bg-primary/90! [&>span>span]:text-primary-foreground!"
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
