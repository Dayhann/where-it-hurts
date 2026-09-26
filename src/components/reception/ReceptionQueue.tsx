'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { getApiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { queueStatus, sortReceptionQueue, type QueueItem } from './queue';

function appointmentTime(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function ReceptionQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const result = await getApiClient().getClinicQueue();
        if (cancelled) return;
        setItems(sortReceptionQueue(result.items));
        setUpdatedAt(new Date());
        setError(false);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void refresh();
    const interval = window.setInterval(() => void refresh(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-wide text-primary uppercase">
            Riverside Family Clinic
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Reception queue
          </h1>
          <p className="text-muted-foreground">
            Today&apos;s pre-consult check-ins
          </p>
        </div>
        <Link
          href="/"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Exit demo
        </Link>
      </header>

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <p aria-live="polite">
          {loading
            ? 'Updating queue…'
            : updatedAt
              ? `Updated ${updatedAt.toLocaleTimeString('en-AU', {
                  hour: 'numeric',
                  minute: '2-digit',
                  second: '2-digit',
                })}`
              : 'Waiting for an update'}
        </p>
        <p>Refreshes every 5 seconds</p>
      </div>

      {error && (
        <p
          className="rounded-lg bg-destructive/10 p-3 text-destructive"
          role="alert"
        >
          The queue could not be refreshed. The last update remains visible.
        </p>
      )}

      <section
        className="overflow-hidden rounded-xl border border-border bg-card"
        aria-label="Today's check-ins"
      >
        {items.length === 0 && !loading ? (
          <p className="p-6 text-muted-foreground">No check-ins yet today.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li
                key={item.sessionId}
                className={cn(
                  'grid min-h-20 grid-cols-[6rem_1fr_auto] items-center gap-4 px-5 py-4',
                  item.redFlag && 'bg-destructive/10',
                )}
              >
                <time className="font-semibold">
                  {appointmentTime(item.startsAt)}
                </time>
                <div>
                  <p className="font-semibold">{item.patientDisplayName}</p>
                  <p className="text-sm text-muted-foreground">
                    Phone consultation
                  </p>
                </div>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-sm font-semibold',
                    item.redFlag
                      ? 'bg-destructive text-white'
                      : item.status === 'confirmed'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {item.redFlag
                    ? 'Red flag — act now'
                    : queueStatus(item.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
