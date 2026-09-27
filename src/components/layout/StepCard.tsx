import { ArrowRight } from 'lucide-react';
import { FigureMark } from './FigureMark';

/**
 * The step card from the design reference: a numbered badge and step name on
 * one line, a serif heading, the instructions, and a right-hand column
 * holding the figure thumbnail and a forward arrow.
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
            <span className="text-sm font-medium">{stepName}</span>
          </div>

          <h2 className="display-title mt-3 text-[1.5rem]">{title}</h2>

          <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
            {body}
          </p>
        </div>

        <FigureMark className="mt-1 h-24 w-12 shrink-0 text-muted-foreground/70" />

        <ArrowRight
          aria-hidden
          className="mt-14 size-5 shrink-0 text-foreground rtl:-scale-x-100"
        />
      </div>
    </section>
  );
}
