import type {
  AssistantTurn,
  Message,
  Question,
  Session,
} from '@/contracts/types';
import { ONSET_FALLBACK_OPTIONS, YES_NO_FALLBACK_OPTIONS } from './chips';

const ESTIMATED_TOTAL = 8;

export function chatHasStarted(session: Session): boolean {
  return session.messages.some((message) => message.role === 'patient');
}

function fallbackQuestion(message: Message): Question {
  const id = message.questionId ?? 'pending';
  const text = { en: message.text, ar: message.text };
  if (id === 'Q_ONSET') {
    return {
      id,
      slot: 'onset',
      kind: 'single',
      text,
      options: ONSET_FALLBACK_OPTIONS,
    };
  }
  if (id === 'Q_SEV') {
    return { id, slot: 'severity', kind: 'scale', text };
  }
  if (id.startsWith('RF_')) {
    return {
      id,
      slot: 'redflag',
      kind: 'single',
      text,
      options: YES_NO_FALLBACK_OPTIONS,
    };
  }
  return { id, slot: 'site', kind: 'open', text };
}

/** Rebuild the current turn from a loaded session when getSession has no turn. */
export function turnFromSession(session: Session): AssistantTurn | null {
  if (session.status === 'redflag_stopped') {
    return { type: 'redflag_stop', hits: session.redFlags };
  }
  if (session.status === 'awaiting_confirm' || session.status === 'confirmed') {
    return { type: 'done' };
  }
  const last = [...session.messages]
    .reverse()
    .find((message) => message.role === 'assistant');
  if (!last) return null;
  return {
    type: 'question',
    message: last,
    question: fallbackQuestion(last),
    progress: {
      asked: session.askedQuestionIds.length,
      estimatedTotal: ESTIMATED_TOTAL,
    },
  };
}
