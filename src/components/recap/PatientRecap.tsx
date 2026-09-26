'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { patientCopy } from '@/components/i18n/patient';
import { buttonVariants } from '@/components/ui/button';
import type { Lang, PatientRecapLine } from '@/contracts/types';
import { getApiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { recapEdits } from './recap';

export function PatientRecap({
  sessionId,
  alreadyConfirmed,
  lang,
}: {
  sessionId: string;
  alreadyConfirmed: boolean;
  lang: Lang;
}) {
  const [lines, setLines] = useState<PatientRecapLine[]>([]);
  const [loading, setLoading] = useState(!alreadyConfirmed);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(alreadyConfirmed);
  const [error, setError] = useState(false);
  const copy = patientCopy(lang).recap;

  useEffect(() => {
    if (alreadyConfirmed) return;
    let cancelled = false;
    getApiClient()
      .getRecap(sessionId)
      .then(({ lines: next }) => {
        if (!cancelled) setLines(next);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [alreadyConfirmed, sessionId]);

  const confirm = async () => {
    setSubmitting(true);
    setError(false);
    try {
      await getApiClient().confirm(sessionId, { edits: recapEdits(lines) });
      setConfirmed(true);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <section className="flex flex-1 flex-col justify-center gap-6 py-8">
        <div className="flex flex-col gap-2">
          <p className="text-lg text-muted-foreground">{copy.complete}</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {copy.thanks}
          </h1>
          <p>{copy.sent}</p>
        </div>
        <Link
          href="/"
          className={cn(buttonVariants({ size: 'touch' }), 'text-lg')}
        >
          {copy.finish}
        </Link>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-lg text-muted-foreground">
          {patientCopy(lang).checkin.label} {sessionId}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p>{copy.instructions}</p>
      </header>

      {loading ? (
        <p className="text-lg text-muted-foreground" aria-live="polite">
          {copy.loading}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {lines.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-4">
              {copy.empty}
            </p>
          ) : (
            lines.map((line, index) => (
              <label
                key={`${line.slot}-${index}`}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
              >
                <span className="font-medium">
                  {copy.answer} {index + 1}
                </span>
                <textarea
                  value={line.text}
                  rows={3}
                  disabled={submitting}
                  onChange={(event) => {
                    const text = event.target.value;
                    setLines((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, text } : item,
                      ),
                    );
                  }}
                  className="min-h-11 resize-y rounded-lg border border-input bg-background px-3 py-2 text-lg leading-7 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </label>
            ))
          )}
        </div>
      )}

      {error && (
        <p className="text-lg text-destructive" role="alert">
          {copy.error}
        </p>
      )}

      <button
        type="button"
        disabled={loading || submitting || lines.length === 0}
        onClick={() => void confirm()}
        className={cn(buttonVariants({ size: 'touch' }), 'text-lg')}
      >
        {submitting ? copy.sending : copy.confirm}
      </button>

      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: 'outline', size: 'touch' }),
          'text-lg',
        )}
      >
        {copy.back}
      </Link>
    </section>
  );
}
