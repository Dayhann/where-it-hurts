import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function ReceptionPage() {
  return (
    <main className="flex flex-1 flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Reception</h1>
      <p className="text-muted-foreground">
        Today&apos;s check-in queue will go here. Red-flag rows pin to the top.
      </p>
      <Link href="/" className={cn(buttonVariants({ variant: 'outline' }))}>
        Back to start
      </Link>
    </main>
  );
}
