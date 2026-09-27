'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import BodyViewer, {
  type BodySnapshots,
} from '@/components/body-map/BodyViewer';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatThread } from '@/components/chat/ChatThread';
import { replyChips } from '@/components/chat/chips';
import { progressLabel } from '@/components/chat/progress';
import { chatHasStarted, turnFromSession } from '@/components/chat/resume-turn';
import { patientCopy } from '@/components/i18n/patient';
import { StepCard } from '@/components/layout/StepCard';
import { PatientRecap } from '@/components/recap/PatientRecap';
import { RedFlagStop } from '@/components/red-flag/RedFlagStop';
import { buttonVariants } from '@/components/ui/button';
import type {
  AssistantTurn,
  BodyMark,
  Message,
  Session,
} from '@/contracts/types';
import { getApiClient } from '@/lib/api-client';
import {
  MarkSaveQueue,
  type MarkSaveState,
} from '@/lib/api-client/mark-save-queue';
import { cn } from '@/lib/utils';

export function CheckinSession({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [turn, setTurn] = useState<AssistantTurn | null>(null);
  const [marks, setMarks] = useState<BodyMark[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveState, setSaveState] = useState<MarkSaveState | 'idle'>('idle');
  const [chatStarted, setChatStarted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const saveQueue = useRef<MarkSaveQueue | null>(null);
  const skipNextSave = useRef(true);

  useEffect(() => {
    let cancelled = false;
    getApiClient()
      .getSession(sessionId)
      .then(({ session: next }) => {
        if (cancelled) return;
        setSession(next);
        setMarks(next.marks);
        setTurn(turnFromSession(next));
        setChatStarted(chatHasStarted(next));
        saveQueue.current = new MarkSaveQueue(
          (queued) =>
            getApiClient()
              .putMarks(sessionId, { marks: queued })
              .then(() => undefined),
          (state) => {
            if (!cancelled) setSaveState(state);
          },
        );
        setSaveState('saved');
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
        setSaveState('local');
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!ready || loadError) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (!saveQueue.current) return;
    const timer = window.setTimeout(() => {
      saveQueue.current?.enqueue(marks);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [marks, sessionId, ready, loadError]);

  const applyTurn = (nextTurn: AssistantTurn, nextSession: Session) => {
    setTurn(nextTurn);
    setSession(nextSession);
    // A chat response can predate the debounced mark save. Keep the local
    // marks as the source of truth instead of restoring that stale snapshot.
  };

  const send = async (payload: {
    text: string;
    choiceId?: string;
    inputMode: 'text' | 'voice' | 'choice';
  }): Promise<boolean> => {
    setSending(true);
    setSendError(false);
    try {
      const result = await getApiClient().postMessage(sessionId, payload);
      applyTurn(result.turn, result.session);
      return true;
    } catch {
      setSendError(true);
      return false;
    } finally {
      setSending(false);
    }
  };

  const finishMarking = async (snapshots: BodySnapshots) => {
    setSaveState('saving');
    try {
      saveQueue.current?.enqueue(marks);
      await saveQueue.current?.waitForIdle();
      await getApiClient().putMarks(sessionId, { marks, snapshots });
      setSaveState('saved');
      setChatStarted(true);
    } catch {
      setSaveState('local');
      throw new Error('Body map save failed');
    }
  };

  const lang = session?.lang ?? 'en';
  const copy = patientCopy(lang);
  const direction = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = direction;
    return () => {
      root.lang = 'en';
      root.dir = 'ltr';
    };
  }, [direction, lang]);

  if (!ready) {
    return (
      <p className="text-muted-foreground" dir={direction}>
        {copy.checkin.loading}
      </p>
    );
  }

  if (turn?.type === 'redflag_stop') {
    return (
      <div dir={direction}>
        <RedFlagStop lang={lang} />
      </div>
    );
  }

  if (turn?.type === 'done' && session) {
    return (
      <div dir={direction} className="flex flex-col gap-5">
        <StepCard
          step={3}
          stepName={copy.checkin.steps[2]}
          title={confirmed ? copy.recap.thanks : copy.recap.title}
          body={confirmed ? copy.recap.sent : copy.recap.instructions}
        />
        <PatientRecap
          sessionId={sessionId}
          alreadyConfirmed={session.status === 'confirmed'}
          onConfirmed={() => setConfirmed(true)}
          lang={lang}
        />
      </div>
    );
  }

  const messages: Message[] = session?.messages ?? [];
  const questionTurn = turn?.type === 'question' ? turn : undefined;
  const showChat = chatStarted;

  return (
    <div dir={direction} className="flex flex-col gap-5">
      {showChat ? (
        <StepCard
          step={2}
          stepName={copy.checkin.steps[1]}
          title={copy.checkin.questions}
          body={
            questionTurn
              ? progressLabel(questionTurn.progress, lang)
              : copy.checkin.stepsLabel
          }
        />
      ) : (
        <StepCard
          step={1}
          stepName={copy.checkin.steps[0]}
          title={
            session?.carerMode
              ? copy.checkin.bodyTitleCarer
              : copy.checkin.bodyTitle
          }
          body={
            session?.carerMode
              ? copy.checkin.bodyInstructionsCarer
              : copy.checkin.bodyInstructions
          }
        />
      )}
      {showChat && session?.carerMode && (
        <p className="surface-inset bg-accent px-4 py-3 text-accent-foreground">
          {copy.checkin.carerBanner}
        </p>
      )}

      {/* Once the questions start the body map is a read-only reminder of
          what was marked. Editing it in place would let answers drift out
          of step with the marks they were given about, so changing it is
          an explicit trip back to the marking step. */}
      <div className="surface !p-4 sm:!p-6">
        <BodyViewer
          marks={marks}
          onChange={setMarks}
          variant={showChat ? 'thumbnail' : 'full'}
          onDone={!showChat && !loadError ? finishMarking : undefined}
          lang={lang}
          carerMode={session?.carerMode === true}
        />
        {showChat && (
          <button
            type="button"
            onClick={() => setChatStarted(false)}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'touch' }),
              'mt-3 w-full',
            )}
          >
            <ArrowLeft aria-hidden className="size-4 rtl:-scale-x-100" />
            {copy.checkin.backToBody}
          </button>
        )}
      </div>
      <p className="type-body text-muted-foreground" aria-live="polite">
        {saveState === 'saving' && copy.checkin.saving}
        {saveState === 'saved' && copy.checkin.saved}
        {saveState === 'local' && copy.checkin.local}
      </p>

      {showChat && (
        <>
          <ChatThread messages={messages} typing={sending} lang={lang} />
          {questionTurn && (
            <ChatComposer
              chips={replyChips(questionTurn.question)}
              question={questionTurn.question}
              lang={lang}
              disabled={sending}
              onSend={send}
            />
          )}
          {sendError && (
            <p className="text-lg text-destructive" role="alert">
              {copy.checkin.sendError}
            </p>
          )}
        </>
      )}

      {loadError && (
        <p className="text-lg text-muted-foreground">
          {copy.checkin.linkError}
        </p>
      )}

      <footer className="mt-4 flex flex-col gap-4 border-t border-track pt-6">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'touch' }),
            'self-start text-muted-foreground',
          )}
        >
          {copy.checkin.back}
        </Link>
        {/* Kept for support ("read me the reference at the bottom") but
            demoted — it used to sit above the page heading at 18px, which
            made the first thing a patient in pain read a random string. */}
        <p className="font-mono text-xs break-all text-muted-foreground/70">
          {copy.checkin.label} {sessionId}
        </p>
      </footer>
    </div>
  );
}
