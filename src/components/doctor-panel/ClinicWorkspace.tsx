'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { GetClinicQueueResponse } from '@/contracts/api';
import { buttonVariants } from '@/components/ui/button';
import { HookSidebar } from '@/components/ui/hook-sidebar';
import { getApiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { DoctorPanel } from './DoctorPanel';

type QueueItem = GetClinicQueueResponse['items'][number];

function appointmentTime(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function ClinicWorkspace() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelId, setPanelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getApiClient()
      .getClinicQueue()
      .then(({ items: next }) => {
        if (cancelled) return;
        setItems(next);
        const preferred =
          next.find((item) => item.status === 'confirmed') ?? next[0];
        setSelectedId(preferred?.sessionId ?? null);
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
  }, []);

  const selected = items.find((item) => item.sessionId === selectedId);

  return (
    <main className="flex min-h-[calc(100vh-3rem)] flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-sm font-medium tracking-wide text-primary uppercase">
            Riverside Family Clinic
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Consultation workspace
          </h1>
        </div>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          Exit demo
        </Link>
      </header>

      {error && (
        <p className="rounded-lg bg-destructive/10 p-3 text-destructive">
          Today&apos;s appointments could not be loaded.
        </p>
      )}

      <div className="grid flex-1 gap-4 md:grid-cols-[18rem_1fr]">
        <aside className="rounded-xl border border-border bg-card">
          <h2 className="border-b border-border p-4 font-semibold">
            Today&apos;s patients
          </h2>
          {loading ? (
            <p className="p-4 text-muted-foreground">Loading appointments…</p>
          ) : items.length === 0 ? (
            <p className="p-4 text-muted-foreground">
              No appointments scheduled.
            </p>
          ) : (
            <HookSidebar
              aria-label="Today's patients"
              className="p-3"
              itemClassName="flex min-h-16 items-center justify-between gap-3"
              value={items.findIndex((item) => item.sessionId === selectedId)}
              onChange={(index) => setSelectedId(items[index].sessionId)}
              items={items.map((item) => ({
                key: item.sessionId,
                label: (
                  <>
                    <span>
                      <strong className="block">
                        {item.patientDisplayName}
                      </strong>
                      <span className="text-sm text-muted-foreground">
                        {appointmentTime(item.startsAt)}
                      </span>
                    </span>
                    {item.redFlag && (
                      <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
                        Alert
                      </span>
                    )}
                  </>
                ),
              }))}
            />
          )}
        </aside>

        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {appointmentTime(selected.startsAt)} phone consultation
                  </p>
                  <h2 className="text-xl font-semibold">
                    {selected.patientDisplayName}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Check-in status: {selected.status.replaceAll('_', ' ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPanelId(selected.sessionId)}
                  className={buttonVariants()}
                >
                  Start consult
                </button>
              </div>
              <label className="flex flex-1 flex-col gap-2">
                <span className="font-semibold">Consult notes</span>
                <textarea
                  className="min-h-80 flex-1 resize-none rounded-lg border border-input bg-background p-4 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  placeholder="Record notes during the consultation…"
                />
              </label>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              Select a patient to open the consultation.
            </div>
          )}
        </section>
      </div>

      {panelId && (
        <DoctorPanel sessionId={panelId} onClose={() => setPanelId(null)} />
      )}
    </main>
  );
}
