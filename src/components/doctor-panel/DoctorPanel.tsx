'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Accordion } from '@/components/interior/accordion';
import { CopyButton } from '@/components/interior/copy-button';
import { SegmentedControl } from '@/components/interior/segmented-control';
import { SkeletonSwap } from '@/components/interior/skeleton-swap';
import { buttonVariants } from '@/components/ui/button';
import GridReveal from '@/components/ui/grid-reveal';
import type { ClinicianSummary, Session, SummaryLine } from '@/contracts/types';
import { getApiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { summaryText } from './summary-text';

function messageTime(session: Session, line: SummaryLine, quoteIndex: number) {
  const messageId =
    line.sourceMessageIds[quoteIndex] ?? line.sourceMessageIds[0];
  const message = session.messages.find(({ id }) => id === messageId);
  if (!message) return 'unknown time';
  return new Intl.DateTimeFormat('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(message.createdAt));
}

function useImageAspect(src: string | undefined) {
  const [measured, setMeasured] = useState<{ src: string; aspect: number }>();

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const image = new window.Image();
    image.onload = () => {
      if (cancelled || !image.naturalWidth || !image.naturalHeight) return;
      setMeasured({ src, aspect: image.naturalWidth / image.naturalHeight });
    };
    image.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return measured && measured.src === src ? measured.aspect : undefined;
}

function SummaryQuoteLine({
  line,
  lineIndex,
  session,
  open,
  onToggle,
}: {
  line: SummaryLine;
  lineIndex: number;
  session: Session;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="pressable w-full border-b border-border bg-transparent py-4 pe-2 text-left leading-snug font-medium hover:bg-muted/50"
      >
        <span>{line.text}</span>
        {!line.verified && (
          <span className="label-caps ms-2 bg-accent px-2 py-1 text-accent-foreground!">
            Unverified
          </span>
        )}
      </button>
      {open && (
        <div className="enter-fade mt-2 origin-top rounded-xs border border-border bg-popover p-4">
          <p className="label-caps">Patient&apos;s words</p>
          {line.quotes.map((quote, quoteIndex) => (
            <blockquote
              key={`${lineIndex}-${quoteIndex}`}
              className="mt-2 border-l-2 border-primary pl-3"
            >
              <p>&ldquo;{quote}&rdquo;</p>
              <footer className="mt-1 text-xs text-muted-foreground">
                From the patient&apos;s message at{' '}
                {messageTime(session, line, quoteIndex)}
              </footer>
            </blockquote>
          ))}
          {line.quotes.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              No exact quote was supplied.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function DoctorPanel({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const [summary, setSummary] = useState<ClinicianSummary | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [view, setView] = useState<'front' | 'back'>('front');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [openLine, setOpenLine] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getApiClient().getSummary(sessionId),
      getApiClient().getSession(sessionId),
    ])
      .then(([summaryResult, sessionResult]) => {
        if (cancelled) return;
        setSummary(summaryResult.summary);
        setSession(sessionResult.session);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const sendFeedback = async () => {
    if (!summary?.lines.length || !feedback.trim()) return;
    setError(false);
    try {
      await getApiClient().postFeedback(sessionId, {
        lineIndex: 0,
        note: feedback.trim(),
      });
      setFeedbackSent(true);
      setShowFeedback(false);
    } catch {
      setError(true);
    }
  };

  const snapshot = session?.bodySnapshots?.[view];
  const snapshotAspect = useImageAspect(snapshot);

  return (
    <>
      <button
        type="button"
        aria-label="Close patient summary"
        onClick={onClose}
        className="scrim-in fixed inset-0 z-30 cursor-default bg-foreground/20"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="summary-panel-title"
        className="drawer-in fixed inset-y-0 right-0 z-40 flex w-full max-w-[460px] flex-col border-l border-border bg-background shadow-[var(--elevation-3)]"
      >
        <header className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <p className="eyebrow">Pre-consult check-in</p>
            <h2
              id="summary-panel-title"
              className="display-title mt-1 text-[1.5rem]"
            >
              Patient summary
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close patient summary"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon' }),
              'size-11',
            )}
          >
            <X aria-hidden />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-7 overflow-y-auto px-6 py-6">
          {error && (
            <p className="text-destructive" role="alert">
              This summary could not be loaded or updated.
            </p>
          )}

          {summary &&
            session &&
            (summary.redFlags.length > 0 ? (
              <section className="border-l-2 border-destructive bg-destructive/8 p-4 text-destructive">
                <h3 className="font-semibold">Red flag reported</h3>
                <ul className="mt-1 list-disc pl-5">
                  {summary.redFlags.map((hit) => (
                    <li key={`${hit.ruleId}-${hit.sourceMessageId}`}>
                      {hit.label}
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <p className="rounded-xs bg-muted p-4 font-medium">
                No red flags reported
              </p>
            ))}

          <section>
            <h3 className="label-caps">Headline</h3>
            <SkeletonSwap
              ready={!loading}
              lines={3}
              lineHeight={68}
              barHeight={52}
              label="Summary headline"
              className="mt-2 h-auto! overflow-visible! text-foreground!"
            >
              {summary && session ? (
                summary.headline.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {summary.headline.slice(0, 3).map((text) => {
                      const lineIndex = summary.lines.findIndex(
                        (line) => line.text === text,
                      );
                      const line = summary.lines[lineIndex];
                      return (
                        <li key={text}>
                          {line ? (
                            <SummaryQuoteLine
                              line={line}
                              lineIndex={lineIndex}
                              session={session}
                              open={openLine === lineIndex}
                              onToggle={() =>
                                setOpenLine((current) =>
                                  current === lineIndex ? null : lineIndex,
                                )
                              }
                            />
                          ) : (
                            <p className="font-semibold">{text}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">
                    No summary available yet.
                  </p>
                )
              ) : null}
            </SkeletonSwap>
          </section>

          {summary && session && (
            <>
              {summary.lines.some(
                (line) => !summary.headline.includes(line.text),
              ) && (
                <section>
                  <h3 className="font-semibold">Other details</h3>
                  <div className="mt-2 flex flex-col gap-2">
                    {summary.lines.map((line, lineIndex) =>
                      summary.headline.includes(line.text) ? null : (
                        <SummaryQuoteLine
                          key={`${line.slot}-${lineIndex}`}
                          line={line}
                          lineIndex={lineIndex}
                          session={session}
                          open={openLine === lineIndex}
                          onToggle={() =>
                            setOpenLine((current) =>
                              current === lineIndex ? null : lineIndex,
                            )
                          }
                        />
                      ),
                    )}
                  </div>
                </section>
              )}

              <section className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Body map</h3>
                  <SegmentedControl
                    label="Body view"
                    value={view}
                    onValueChange={(next) => setView(next as 'front' | 'back')}
                    options={[
                      { value: 'front', label: 'Front' },
                      { value: 'back', label: 'Back' },
                    ]}
                  />
                </div>
                <div className="flex h-44 items-center justify-center overflow-hidden rounded-xs border border-border bg-muted">
                  {snapshot ? (
                    snapshotAspect ? (
                      <GridReveal
                        key={snapshot}
                        src={snapshot}
                        alt={`${view} body map marked by the patient`}
                        aspect={snapshotAspect}
                        estimatedDuration={900}
                        className="h-full! w-auto! max-w-full rounded-none!"
                      />
                    ) : null
                  ) : (
                    <p className="px-4 text-center text-muted-foreground">
                      Body snapshot not available.
                    </p>
                  )}
                </div>
              </section>

              <section className="grid grid-cols-2 gap-5">
                <div>
                  <h3 className="font-semibold">Not asked</h3>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {summary.notAsked.length > 0 ? (
                      summary.notAsked.map((slot) => (
                        <span
                          key={slot}
                          className="border border-border bg-muted px-2 py-1 text-sm"
                        >
                          {slot.replaceAll('_', ' ')}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        None
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold">Unsure</h3>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {summary.unsure.length > 0 ? (
                      summary.unsure.map((slot) => (
                        <span
                          key={slot}
                          className="border border-border bg-muted px-2 py-1 text-sm"
                        >
                          {slot.replaceAll('_', ' ')}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        None
                      </span>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <h3 className="font-semibold">Clarify on the call</h3>
                {summary.clarify.length > 0 ? (
                  <ul className="mt-2 list-disc pl-5">
                    {summary.clarify.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-muted-foreground">
                    No prompts recorded.
                  </p>
                )}
              </section>

              <Accordion
                maxPanelHeight={260}
                className="shrink-0 rounded-xs! border-border! bg-card! shadow-none! [&_button]:min-h-11 [&_button>span]:text-sm! [&_button>span:first-child]:text-base! [&_button>span:first-child]:font-semibold! [&_button>span:first-child]:text-foreground!"
                items={[
                  {
                    id: 'transcript',
                    title: 'Transcript',
                    meta: `${session.messages.length} messages`,
                    content: (
                      <div className="flex flex-col gap-2 text-base text-foreground">
                        {session.messages.map((message) => (
                          <p key={message.id}>
                            <strong>
                              {message.role === 'patient'
                                ? 'Patient'
                                : 'Check-in'}
                              :
                            </strong>{' '}
                            {message.text}
                          </p>
                        ))}
                      </div>
                    ),
                  },
                ]}
              />
            </>
          )}
        </div>

        <footer className="flex flex-col gap-3 border-t border-border px-6 py-5">
          {showFeedback && (
            <label className="flex flex-col gap-2">
              <span className="font-medium">What looks inaccurate?</span>
              <textarea
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                rows={2}
                className="rounded-xs border border-input bg-background p-2"
              />
              <button
                type="button"
                disabled={!feedback.trim()}
                onClick={() => void sendFeedback()}
                className={buttonVariants({ size: 'sm' })}
              >
                Send feedback
              </button>
            </label>
          )}
          <div className="grid grid-cols-2 gap-2">
            <CopyButton
              value={summary ? summaryText(summary) : ''}
              disabled={!summary}
              label="Copy to notes"
              copiedLabel="Copied"
              errorLabel="Copy failed"
            />
            <button
              type="button"
              disabled={!summary?.lines.length}
              onClick={() => setShowFeedback((shown) => !shown)}
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              {feedbackSent ? 'Feedback sent' : 'Flag inaccuracy'}
            </button>
          </div>
          {summary && (
            <p className="text-xs leading-5 text-muted-foreground">
              {summary.aiLabel}
            </p>
          )}
        </footer>
      </aside>
    </>
  );
}
