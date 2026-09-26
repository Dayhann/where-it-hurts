'use client';

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
  const [bodyExpanded, setBodyExpanded] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
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
    inputMode: 'text' | 'choice';
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
      setBodyExpanded(false);
      setChatStarted(true);
    } catch {
      setSaveState('local');
      throw new Error('Body map save failed');
    }
  };

  if (!ready) {
    return <p className="text-muted-foreground">Loading your check-in…</p>;
  }

  if (turn?.type === 'redflag_stop') {
    return <RedFlagStop />;
  }

  if (turn?.type === 'done' && session) {
    return (
      <PatientRecap
        sessionId={sessionId}
        alreadyConfirmed={session.status === 'confirmed'}
      />
    );
  }

  const messages: Message[] = session?.messages ?? [];
  const questionTurn = turn?.type === 'question' ? turn : undefined;
  const showChat = chatStarted;
  const compactBody = showChat && !bodyExpanded;
  const lang = session?.lang ?? 'en';

  return (
    <>
      {showChat ? (
        <div className="flex flex-col gap-1">
          <p className="text-lg text-muted-foreground">Check-in {sessionId}</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            A few questions
          </h1>
          {questionTurn && (
            <p className="text-lg text-muted-foreground">
              {progressLabel(questionTurn.progress)}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-lg text-muted-foreground">Check-in {sessionId}</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Tap where it hurts
          </h1>
          <p>
            Choose &quot;Where it hurts&quot;, then tap each part of the body
            that hurts. If the pain moves or spreads somewhere else, choose
            &quot;Where it spreads&quot; and tap those parts too.
          </p>
        </div>
      )}

      <BodyViewer
        marks={marks}
        onChange={setMarks}
        variant={compactBody ? 'thumbnail' : 'full'}
        onExpand={compactBody ? () => setBodyExpanded(true) : undefined}
        onDone={!showChat && !loadError ? finishMarking : undefined}
      />
      {showChat && bodyExpanded && (
        <button
          type="button"
          onClick={() => setBodyExpanded(false)}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'touch' }),
            'text-lg',
          )}
        >
          Back to questions
        </button>
      )}
      <p className="text-lg text-muted-foreground" aria-live="polite">
        {saveState === 'saving' && 'Saving your marks…'}
        {saveState === 'saved' && 'Marks saved for this check-in.'}
        {saveState === 'local' &&
          'Marks stay on this screen for now. They will save when the check-in link is ready.'}
      </p>

      {showChat && (
        <>
          <ChatThread messages={messages} typing={sending} />
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
              We could not send that. Try again.
            </p>
          )}
        </>
      )}

      {loadError && (
        <p className="text-lg text-muted-foreground">
          This check-in link is not ready yet. You can still mark the body on
          this screen.
        </p>
      )}

      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: 'outline', size: 'touch' }),
          'text-lg',
        )}
      >
        Back to start
      </Link>
    </>
  );
}
