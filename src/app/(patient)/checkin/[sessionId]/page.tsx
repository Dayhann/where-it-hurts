'use client';

import Link from 'next/link';
import { Suspense, use, useEffect, useRef, useState } from 'react';
import BodyViewer from '@/components/body-map/BodyViewer';
import { buttonVariants } from '@/components/ui/button';
import type { BodyMark } from '@/contracts/types';
import { getApiClient } from '@/lib/api-client';
import {
  MarkSaveQueue,
  type MarkSaveState,
} from '@/lib/api-client/mark-save-queue';
import { cn } from '@/lib/utils';

function CheckinBody({ sessionId }: { sessionId: string }) {
  const [marks, setMarks] = useState<BodyMark[]>([]);
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<MarkSaveState | 'idle'>('idle');
  const saveQueue = useRef<MarkSaveQueue | null>(null);
  const skipNextSave = useRef(true);

  useEffect(() => {
    let cancelled = false;
    getApiClient()
      .getSession(sessionId)
      .then(({ session }) => {
        if (cancelled) return;
        setMarks(session.marks);
        saveQueue.current = new MarkSaveQueue(
          (next) =>
            getApiClient()
              .putMarks(sessionId, { marks: next })
              .then(() => undefined),
          (state) => {
            if (!cancelled) setSaveState(state);
          },
        );
        setSaveState('saved');
      })
      .catch(() => {
        if (cancelled) return;
        setSaveState('local');
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!ready) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (!saveQueue.current) return;
    const timer = window.setTimeout(() => {
      saveQueue.current?.enqueue(marks);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [marks, sessionId, ready]);

  if (!ready) {
    return <p className="text-muted-foreground">Loading your check-in…</p>;
  }

  return (
    <>
      <BodyViewer marks={marks} onChange={setMarks} />
      <p className="text-lg text-muted-foreground" aria-live="polite">
        {saveState === 'saving' && 'Saving your marks…'}
        {saveState === 'saved' && 'Marks saved for this check-in.'}
        {saveState === 'local' &&
          'Marks stay on this screen for now. They will save when the check-in link is ready.'}
      </p>
    </>
  );
}

export default function CheckinPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);

  return (
    <main className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="text-lg text-muted-foreground">Check-in {sessionId}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Tap where it hurts
        </h1>
        <p>
          Choose &quot;Where it hurts&quot;, then tap each part of the body that
          hurts. If the pain moves or spreads somewhere else, choose &quot;Where
          it spreads&quot; and tap those parts too.
        </p>
      </div>
      <Suspense
        fallback={
          <p className="text-muted-foreground">Loading the body map…</p>
        }
      >
        <CheckinBody key={sessionId} sessionId={sessionId} />
      </Suspense>
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: 'outline', size: 'touch' }),
          'text-lg',
        )}
      >
        Back to start
      </Link>
    </main>
  );
}
