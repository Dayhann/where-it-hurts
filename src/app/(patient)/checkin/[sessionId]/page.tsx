import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return (
    <main className="flex flex-1 flex-col gap-6">
      <p className="text-sm text-muted-foreground">Check-in {sessionId}</p>
      <h1 className="text-2xl font-semibold tracking-tight">
        Mark where it hurts
      </h1>
      <p>
        Next you will tap the body to show the pain, then answer a few short
        questions. This screen is a placeholder until the body map is ready.
      </p>
      <Link
        href="/"
        className={cn(buttonVariants({ variant: 'outline', size: 'touch' }))}
      >
        Back to start
      </Link>
    </main>
  );
}
