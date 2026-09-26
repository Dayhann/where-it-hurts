import Link from 'next/link';
import { PageShell } from '@/components/layout/PageShell';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DEMO_SESSION_ID = 'mock-in-progress';

export default function Home() {
  return (
    <PageShell variant="patient">
      <main className="flex flex-1 flex-col justify-center gap-8 py-4">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-medium tracking-wide text-primary uppercase">
            Pre-consult check-in
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Where It Hurts
          </h1>
          <p>
            Show where the pain is, answer a few questions, and your clinician
            gets a short summary before the call.
          </p>
        </header>

        <nav className="flex flex-col gap-3" aria-label="Demo screens">
          <Link
            href={`/checkin/${DEMO_SESSION_ID}`}
            className={cn(buttonVariants({ size: 'touch' }), 'w-full')}
          >
            Start patient check-in
          </Link>
          <Link
            href="/clinic"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'touch' }),
              'w-full',
            )}
          >
            Open clinic view
          </Link>
          <Link
            href="/reception"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'touch' }),
              'w-full',
            )}
          >
            Open reception
          </Link>
        </nav>

        <p className="text-sm leading-6 text-muted-foreground">
          This is a prototype with made-up patients only. It does not diagnose,
          treat, or give medical advice. If this is an emergency, call{' '}
          <a className="underline underline-offset-2" href="tel:000">
            000
          </a>
          .
        </p>
      </main>
    </PageShell>
  );
}
