import { ArrowRight } from 'lucide-react';

/**
 * The step card: a numbered badge and step name on one line, a heading,
 * the instructions, and a forward arrow.
 */
export function StepCard({
  step,
  stepName,
  title,
  body,
}: {
  step: number;
  stepName: string;
  title: string;
  body: string;
}) {
  return (
    <section className="surface">
      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
            >
              {step}
            </span>
            <span className="type-body text-foreground">{stepName}</span>
          </div>

          <h2 className="type-section mt-3">{title}</h2>

          <p className="mt-2 text-[18px] leading-[1.5] text-muted-foreground">
            {body}
          </p>
        </div>

        <ArrowRight
          aria-hidden
          className="mt-8 size-5 shrink-0 text-strong rtl:-scale-x-100"
        />
      </div>
    </section>
  );
}
