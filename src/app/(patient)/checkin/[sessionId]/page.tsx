'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import BodyViewer from '@/components/body-map/BodyViewer';
import { buttonVariants } from '@/components/ui/button';
import type { BodyMark } from '@/contracts/types';
import { cn } from '@/lib/utils';

export default function CheckinPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const [marks, setMarks] = useState<BodyMark[]>([]);

  return (
    <main className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="text-base text-muted-foreground">Check-in {sessionId}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Tap where it hurts
        </h1>
        <p>
          Choose &quot;Where it hurts&quot;, then tap each part of the body that
          hurts. If the pain moves or spreads somewhere else, choose &quot;Where
          it spreads&quot; and tap those parts too.
        </p>
      </div>
      <BodyViewer marks={marks} onChange={setMarks} />
      <Link
        href="/"
        className={cn(buttonVariants({ variant: 'outline', size: 'touch' }))}
      >
        Back to start
      </Link>
    </main>
  );
}
