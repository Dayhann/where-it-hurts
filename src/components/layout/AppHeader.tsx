import { CalendarDays } from 'lucide-react';
import { HeroRidges } from './HeroRidges';

function Peaks({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 16"
      fill="none"
      aria-hidden
      className={className}
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 14 14 3l7.5 7" />
      <path d="M17 14 30 2l16 12" />
    </svg>
  );
}

/**
 * Masthead for the patient flow: a misted landscape band, the wordmark, and
 * today's date. The band is a gradient standing in for the photograph in the
 * design reference — drop a real image in behind it when one exists.
 */
export function AppHeader({
  date,
  greeting,
  title,
}: {
  date?: Date;
  /** Small line above the title, e.g. "Good to see you,". */
  greeting?: string;
  /** Serif headline. Sits over the hero, as in the design reference. */
  title?: string;
}) {
  const today = date ?? new Date();
  const label = new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(today);

  return (
    <div className="relative -mx-5 -mt-8 px-5 pt-8 pb-12 sm:-mx-8 sm:-mt-12 sm:px-8 sm:pt-12">
      <HeroRidges className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Peaks className="h-3.5 w-11 text-primary/70" />
          <p className="text-[0.8125rem] font-medium tracking-[0.32em] text-primary uppercase">
            Recover
          </p>
        </div>

        <p className="flex items-center gap-2 rounded-full bg-card/85 px-3.5 py-2 text-xs font-medium text-foreground shadow-[var(--elevation-1)] backdrop-blur-sm">
          <CalendarDays
            aria-hidden
            className="size-3.5 text-muted-foreground"
          />
          <time dateTime={today.toISOString().slice(0, 10)}>{label}</time>
        </p>
      </div>

      {(greeting ?? title) && (
        <header className="relative mt-7 flex flex-col">
          {greeting && (
            <p className="text-base text-muted-foreground">{greeting}</p>
          )}
          {title && (
            <h1 className="display-title mt-1 text-[2.125rem]">{title}</h1>
          )}
        </header>
      )}
    </div>
  );
}
