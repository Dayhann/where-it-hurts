'use client';

import { Suspense, use } from 'react';
import { CheckinSession } from '@/components/checkin/CheckinSession';

export default function CheckinPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);

  return (
    <main className="flex flex-1 flex-col gap-5">
      <Suspense
        fallback={
          <p className="text-muted-foreground">Loading your check-in…</p>
        }
      >
        <CheckinSession key={sessionId} sessionId={sessionId} />
      </Suspense>
    </main>
  );
}
