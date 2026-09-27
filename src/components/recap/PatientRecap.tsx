'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { patientCopy } from '@/components/i18n/patient';
import { LoadingButton } from '@/components/interior/loading-button';
import { buttonVariants } from '@/components/ui/button';
import type { Lang, PatientRecapLine } from '@/contracts/types';
import { getApiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { recapEdits } from './recap';
const SHOW_SENT_MS = 700;

export function PatientRecap({
  sessionId,
  alreadyConfirmed,
  onConfirmed,
  lang,
}: {
  sessionId: string;
  alreadyConfirmed: boolean;
  onConfirmed?: () => void;
  lang: Lang;
}) {
  const [lines, setLines] = useState<PatientRecapLine[]>([]);
  const [loading, setLoading] = useState(!alreadyConfirmed);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
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
    if (sent) return;
    setSubmitting(true);
    setError(false);
    try {
      await getApiClient().confirm(sessionId, { edits: recapEdits(lines) });
      setSent(true);
      setTimeout(() => {
        setConfirmed(true);
        onConfirmed?.();
      }, SHOW_SENT_MS);
    } catch (cause) {
      setError(true);
      setSubmitting(false);
      throw cause;
    }
  };

  if (confirmed) {
    return (
      <section className="enter-fade flex flex-1 flex-col justify-center gap-8 py-8">
        <div className="flex flex-col gap-2">
          <p className="text-lg text-muted-foreground">{copy.complete}</p>
          <h1 className="display-title text-3xl font-semibold tracking-tight">
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
    <section className="flex flex-col gap-8">
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
            <p className="rounded-xs border border-border bg-card p-5">
              {copy.empty}
            </p>
          ) : (
            lines.map((line, index) => (
              <label
                key={`${line.slot}-${index}`}
                className="flex flex-col gap-3 rounded-xs border border-border bg-card p-5"
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
                  className="min-h-14 resize-y rounded-xs border border-input bg-background px-4 py-3 text-lg leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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

      <LoadingButton
        onAction={confirm}
        disabled={loading || lines.length === 0}
        pendingLabel={copy.sending}
        successLabel={copy.sentShort}
        errorLabel={copy.retry}
        className="h-14! w-full rounded-xs! border-primary! bg-primary! text-lg! hover:bg-primary/90! [&>span>span]:text-primary-foreground!"
      >
        {copy.confirm}
      </LoadingButton>

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
