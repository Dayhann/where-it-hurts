'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { patientCopy } from '@/components/i18n/patient';
import { LoadingButton } from '@/components/interior/loading-button';
import { getApiClient } from '@/lib/api-client';

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
    <main className="stagger-in flex flex-1 flex-col py-2 [&>*+*]:mt-7">
      <section className="flex flex-col items-center text-center">
        <h2 className="type-display text-strong">{copy.home.headline}</h2>
        <p className="mt-3 max-w-[22rem] text-[18px] leading-[1.5] text-muted-foreground">
          {copy.home.description}
        </p>
      </section>

      <label className="card-row cursor-pointer py-3 transition-colors hover:bg-muted/40">
        <input
          type="checkbox"
          checked={carerMode}
          onChange={(event) => setCarerMode(event.target.checked)}
          className="size-5 accent-primary"
        />
        <span className="text-[18px] leading-[1.4]">{copy.home.carer}</span>
      </label>

      {error && (
        <p className="text-destructive" role="alert">
          {copy.home.error}
        </p>
      )}

      <LoadingButton
        onAction={start}
        pendingLabel={copy.home.starting}
        successLabel={copy.home.opening}
        errorLabel={copy.recap.retry}
        className="button-raised! h-[46px]! w-full rounded-full! text-base! hover:brightness-110 [&>span>span]:text-primary-foreground!"
      >
        {copy.home.start}
      </LoadingButton>

      <footer className="type-body border-t border-track pt-6 text-muted-foreground">
        <p>
          {copy.home.prototype}{' '}
          <a
            className="font-medium text-foreground underline underline-offset-4"
            href="tel:000"
          >
            {copy.home.emergency}
          </a>
        </p>
      </footer>
    </main>
  );
}
