import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function ClinicPage() {
  return (
    <main className="flex flex-1 flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Clinic</h1>
      <p className="text-muted-foreground">
        Mock practice software and the doctor side panel will go here.
      </p>
      <Link href="/" className={cn(buttonVariants({ variant: 'outline' }))}>
        Back to start
      </Link>
    </main>
  );
}
