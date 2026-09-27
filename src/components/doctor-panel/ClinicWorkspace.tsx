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
    <main className="flex min-h-[calc(100vh-3rem)] flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-track pb-6">
        <div>
          <p className="text-muted-foreground">Riverside Family Clinic</p>
          <h1 className="type-title mt-1">Consultation workspace</h1>
        </div>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          Exit demo
        </Link>
      </header>

      {error && (
        <p className="pinned surface-inset bg-card py-4 ps-5 pe-4 text-destructive [--pin:var(--destructive)]">
          Today&apos;s appointments could not be loaded.
        </p>
      )}

      <div className="grid flex-1 gap-6 md:grid-cols-[19rem_1fr]">
        <aside className="surface h-fit !p-0 !pb-2">
          <h2 className="type-section border-b border-track px-5 py-4">
            Today&apos;s patients
          </h2>
          {loading ? (
            <p className="px-5 py-5 text-muted-foreground">
              Loading appointments…
            </p>
          ) : items.length === 0 ? (
            <p className="py-5 text-muted-foreground">
              No appointments scheduled.
            </p>
          ) : (
            <>
              {/* HookSidebar renders plain strings, so a flagged patient is
                  indistinguishable from an appointment time in the list.
                  This strip restores the at-a-glance alarm that the list
                  itself can no longer carry, and jumps straight to them. */}
              {items.some((item) => item.redFlag) && (
                <div className="border-b border-track py-3">
                  {items
                    .filter((item) => item.redFlag)
                    .map((item) => (
                      <button
                        key={item.sessionId}
                        type="button"
                        onClick={() => setSelectedId(item.sessionId)}
                        className="pressable button-raised-alert mx-3 flex min-h-[42px] items-center justify-between gap-3 rounded-full py-1.5 ps-4 pe-1.5 text-left hover:brightness-[0.98]"
                      >
                        <span className="font-semibold">
                          {item.patientDisplayName}
                        </span>
                        <span className="rounded-full bg-destructive px-2.5 py-1 font-medium text-background">
                          Red flag
                        </span>
                      </button>
                    ))}
                </div>
              )}
              <HookSidebar
                aria-label="Today's patients"
                className="py-4"
                color="var(--primary)"
                value={items.findIndex((item) => item.sessionId === selectedId)}
                onChange={(index) => setSelectedId(items[index].sessionId)}
                items={items.map((item) =>
                  [
                    item.patientDisplayName,
                    appointmentTime(item.startsAt),
                    item.redFlag ? 'Red flag' : null,
                  ]
                    .filter(Boolean)
                    .join(' · '),
                )}
              />
            </>
          )}
        </aside>

        <section className="surface flex flex-col gap-7 !p-7">
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-muted-foreground">
                    {appointmentTime(selected.startsAt)} phone consultation
                  </p>
                  <h2 className="type-title mt-1 flex items-center gap-3">
                    {selected.patientDisplayName}
                    {selected.redFlag && (
                      <span className="type-body rounded-full bg-destructive px-2.5 py-1 font-medium text-background">
                        Red flag
                      </span>
                    )}
                  </h2>
                  <p className="mt-1 text-muted-foreground">
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
                <span className="type-section">Consult notes</span>
                <textarea
                  className="field min-h-80 flex-1 resize-none p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
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
