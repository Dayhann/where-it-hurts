'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
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
        className="w-full rounded-lg border border-border p-3 text-left font-semibold hover:bg-muted"
      >
        <span>{line.text}</span>
        {!line.verified && (
          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
            Unverified
          </span>
        )}
      </button>
      {open && (
        <div className="enter-fade mt-1 origin-top rounded-lg border border-border bg-popover p-3 shadow-lg">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Patient&apos;s words
          </p>
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
  const [copied, setCopied] = useState(false);
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

  const copy = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summaryText(summary));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

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
        className="drawer-in fixed inset-y-0 right-0 z-40 flex w-full max-w-[420px] flex-col border-l border-border bg-background shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-border p-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Pre-consult check-in
            </p>
            <h2 id="summary-panel-title" className="text-xl font-semibold">
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

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
          {loading && <p className="text-muted-foreground">Loading summary…</p>}
          {error && (
            <p className="text-destructive" role="alert">
              This summary could not be loaded or updated.
            </p>
          )}

          {summary && session && (
            <>
              {summary.redFlags.length > 0 ? (
                <section className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-destructive">
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
                <p className="rounded-lg bg-muted p-3 font-medium">
                  No red flags reported
                </p>
              )}

              <section>
                <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                  Headline
                </h3>
                {summary.headline.length > 0 ? (
                  <ul className="mt-2 flex flex-col gap-2">
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
                  <p className="mt-2 text-muted-foreground">
                    No summary available yet.
                  </p>
                )}
              </section>

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
                  <div
                    className="flex gap-1"
                    role="group"
                    aria-label="Body view"
                  >
                    {(['front', 'back'] as const).map((side) => (
                      <button
                        key={side}
                        type="button"
                        onClick={() => setView(side)}
                        aria-pressed={view === side}
                        className={buttonVariants({
                          variant: view === side ? 'default' : 'outline',
                          size: 'sm',
                        })}
                      >
                        {side === 'front' ? 'Front' : 'Back'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex h-44 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                  {snapshot ? (
                    <Image
                      src={snapshot}
                      alt={`${view} body map marked by the patient`}
                      width={360}
                      height={176}
                      unoptimized
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <p className="px-4 text-center text-muted-foreground">
                      Body snapshot not available.
                    </p>
                  )}
                </div>
              </section>

              <section className="grid grid-cols-2 gap-3">
                <div>
                  <h3 className="font-semibold">Not asked</h3>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {summary.notAsked.length > 0 ? (
                      summary.notAsked.map((slot) => (
                        <span
                          key={slot}
                          className="rounded-full bg-muted px-2 py-1 text-sm"
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
                          className="rounded-full bg-muted px-2 py-1 text-sm"
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

              <details className="rounded-lg border border-border p-3">
                <summary className="cursor-pointer font-semibold">
                  Transcript
                </summary>
                <div className="mt-3 flex flex-col gap-2">
                  {session.messages.map((message) => (
                    <p key={message.id}>
                      <strong>
                        {message.role === 'patient' ? 'Patient' : 'Check-in'}:
                      </strong>{' '}
                      {message.text}
                    </p>
                  ))}
                </div>
              </details>
            </>
          )}
        </div>

        <footer className="flex flex-col gap-3 border-t border-border p-4">
          {showFeedback && (
            <label className="flex flex-col gap-2">
              <span className="font-medium">What looks inaccurate?</span>
              <textarea
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                rows={2}
                className="rounded-lg border border-input bg-background p-2"
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
            <button
              type="button"
              disabled={!summary}
              onClick={() => void copy()}
              className={buttonVariants({ variant: 'outline' })}
            >
              {copied ? 'Copied' : 'Copy to notes'}
            </button>
            <button
              type="button"
              disabled={!summary?.lines.length}
              onClick={() => setShowFeedback((shown) => !shown)}
              className={buttonVariants({ variant: 'outline' })}
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
