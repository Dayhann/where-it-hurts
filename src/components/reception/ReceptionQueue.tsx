'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  LiveActivity,
  useLiveActivity,
} from '@/components/interior/live-activity';
import {
  NewItemsPill,
  useNewItems,
} from '@/components/interior/new-items-pill';
import { ValueFlash } from '@/components/interior/value-flash';
import { buttonVariants } from '@/components/ui/button';
import { getApiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  queueChanges,
  queueStatus,
  sortReceptionQueue,
  type QueueItem,
} from './queue';

function appointmentTime(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function rowId(sessionId: string) {
  return `queue-${sessionId}`;
}

export function ReceptionQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const lastItems = useRef<QueueItem[] | null>(null);
  const { activity, start, succeed, fail, dismiss } = useLiveActivity({
    linger: 3000,
  });
  const { scrollProps, unread, jump } = useNewItems<HTMLDivElement>({
    itemCount: items.length,
  });
  const redFlags = items.filter((item) => item.redFlag).length;

  const announce = useRef<(next: QueueItem[]) => void>(() => {});
  useEffect(() => {
    announce.current = (next) => {
      const { arrived, flagged } = queueChanges(lastItems.current, next);
      lastItems.current = next;
      const alert = flagged[0];
      if (alert) {
        start({ title: 'Red flag', detail: alert.patientDisplayName });
        fail(undefined, {
          label: 'Show',
          onClick: () => {
            dismiss();
            jump();
            document.getElementById(rowId(alert.sessionId))?.focus();
          },
        });
        return;
      }
      const newest = arrived[0];
      if (newest) {
        start({
          title:
            arrived.length > 1
              ? `${arrived.length} new check-ins`
              : 'New check-in',
          detail: newest.patientDisplayName,
        });
        succeed();
      }
    };
  });

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const result = await getApiClient().getClinicQueue();
        if (cancelled) return;
        const sorted = sortReceptionQueue(result.items);
        setItems(sorted);
        announce.current(sorted);
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
    <main className="flex flex-1 flex-col gap-8">
      <LiveActivity
        activity={activity}
        onDismiss={dismiss}
        label="Queue alerts"
        dismissLabel="Dismiss alert"
        className="fixed inset-x-0 top-4 z-50"
      />
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="eyebrow">Riverside Family Clinic</p>
          <h1 className="display-title mt-2 text-[1.75rem]">Reception queue</h1>
          <p className="text-muted-foreground">
            Today&apos;s pre-consult check-ins
          </p>
        </div>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          Exit demo
        </Link>
      </header>

      <dl className="grid grid-cols-2 gap-5">
        <div className="border-t-2 border-foreground/80 pt-5">
          <dt className="label-caps">Checked in</dt>
          <dd>
            <ValueFlash
              value={items.length}
              label="Checked in"
              className="-ms-1.5 text-2xl! font-semibold!"
            />
          </dd>
        </div>
        <div className="border-t-2 border-foreground/80 pt-5">
          <dt className="label-caps">Red flags</dt>
          <dd>
            <ValueFlash
              value={redFlags}
              label="Red flags"
              className={cn(
                '-ms-1.5 text-2xl! font-semibold! [&>span.absolute]:bg-destructive/15!',
                redFlags > 0 && 'text-destructive!',
              )}
            />
          </dd>
        </div>
      </dl>

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
          className="border-l-2 border-destructive bg-destructive/8 p-3 text-destructive"
          role="alert"
        >
          The queue could not be refreshed. The last update remains visible.
        </p>
      )}

      <section
        className="relative overflow-hidden border-t-2 border-foreground/80"
        aria-label="Today's check-ins"
      >
        <NewItemsPill
          count={unread}
          onJump={jump}
          label={(count) =>
            `${count} new ${count === 1 ? 'check-in' : 'check-ins'}`
          }
        />
        <div
          {...scrollProps}
          className="max-h-[60vh] overflow-y-auto outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {items.length === 0 && !loading ? (
            <p className="p-6 text-muted-foreground">No check-ins yet today.</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li
                  key={item.sessionId}
                  id={rowId(item.sessionId)}
                  tabIndex={-1}
                  className={cn(
                    'grid min-h-24 grid-cols-[6rem_1fr_auto] items-center gap-5 px-6 py-5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset',
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
                      'label-caps px-2.5 py-1.5',
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
        </div>
      </section>
    </main>
  );
}
