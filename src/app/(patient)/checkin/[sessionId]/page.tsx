'use client';

import Link from 'next/link';
import { use } from 'react';
import BodyViewer from '@/components/body-map/BodyViewer';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function CheckinPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);

  return (
    <main className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Check-in {sessionId}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Turn the body so you can see where it hurts
        </h1>
      </div>
      <BodyViewer />
      <Link
        href="/"
        className={cn(buttonVariants({ variant: 'outline', size: 'touch' }))}
      >
        Back to start
      </Link>
    </main>
  );
}
