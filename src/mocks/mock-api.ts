import { nanoid } from 'nanoid';
import type { ApiClient } from '@/contracts/api';
import {
  ConfirmRequestSchema,
  ConfirmResponseSchema,
  CreateSessionRequestSchema,
  CreateSessionResponseSchema,
  GetClinicQueueResponseSchema,
  GetRecapResponseSchema,
  GetSessionResponseSchema,
  GetSummaryResponseSchema,
  PostFeedbackRequestSchema,
  PostFeedbackResponseSchema,
  PostMessageRequestSchema,
  PostMessageResponseSchema,
  PutMarksRequestSchema,
  PutMarksResponseSchema,
} from '@/contracts/api';
import type {
  AssistantTurn,
  ClinicianSummary,
  Message,
  Question,
  RedFlagHit,
  Session,
  SlotFact,
  SocratesSlot,
} from '@/contracts/types';
import { questionBank } from '@/server/questions/bank';
import { mockConfirmedSummary, mockSessions } from './fixtures';

const questions = questionBank;
const questionById = new Map(
  questions.map((question) => [question.id, question]),
);
const demoQuestions = [
  'Q_OPEN',
  'Q_ONSET',
  'Q_CHAR',
  'RF_SADDLE',
  'RF_BLADDER',
  'RF_BILAT_WEAK',
  'RF_FEVER_TRAUMA',
  'Q_SEV',
].map(question);
const slots: SocratesSlot[] = [
  'site',
  'onset',
  'character',
  'radiation',
  'associated',
  'timing',
  'exacerbating',
  'relieving',
  'severity',
  'meds_tried',
];

function question(id: string): Question {
  const found = questionById.get(id);
  if (!found) throw new Error(`Mock question ${id} is missing from the bank`);
  return found;
}

function nextQuestion(session: Session): Question | undefined {
  return demoQuestions.find(
    (candidate) => !session.askedQuestionIds.includes(candidate.id),
  );
}

function questionTurn(session: Session, next: Question): AssistantTurn {
  const message: Message = {
    id: nanoid(),
    role: 'assistant',
    questionId: next.id,
    text: next.text[session.lang],
    createdAt: new Date().toISOString(),
  };
  session.messages.push(message);
  session.askedQuestionIds.push(next.id);
  return {
    type: 'question',
    message,
    question: next,
    progress: {
      asked: session.askedQuestionIds.length,
      estimatedTotal: demoQuestions.length,
    },
  };
}

function lastQuestion(session: Session): Question | undefined {
  const last = [...session.messages]
    .reverse()
    .find((message) => message.role === 'assistant' && message.questionId);
  return last?.questionId ? questionById.get(last.questionId) : undefined;
}

function safetyHit(
  answer: Message,
  asked: Question | undefined,
): RedFlagHit | undefined {
  if (
    asked?.mandatory &&
    (answer.choiceId === 'yes' ||
      answer.choiceId === 'not_sure' ||
      (asked.id === 'RF_FEVER_TRAUMA' &&
        answer.choiceId !== undefined &&
        answer.choiceId !== 'none' &&
        answer.choiceId !== 'something_else') ||
      /^(yes|not sure|نعم|لست متأكداً)\.?$/i.test(answer.text.trim()))
  ) {
    return {
      ruleId: `MOCK_${asked.id}`,
      label: `Flagged answer to ${asked.id}`,
      sourceMessageId: answer.id,
    };
  }
  // Demo phrases only. B-04 supplies the complete deterministic rule set.
  const phrases = [
    {
      ruleId: 'RF_CAUDA_SADDLE',
      label: 'Possible saddle anaesthesia',
      pattern:
        /\b(?:numb|no feeling|can't feel|pins and needles)\b.{0,60}\b(?:groin|bottom|bum|buttock|inner thigh|saddle)\b/i,
    },
    {
      ruleId: 'RF_CAUDA_BLADDER',
      label: 'New bladder or bowel difficulty',
      pattern:
        /\b(?:can't pee|cannot urinate|wet myself|lost control of my bladder|trouble passing urine)\b/i,
    },
    {
      ruleId: 'RF_BILATERAL',
      label: 'Bilateral leg weakness',
      pattern: /\bboth legs\b.{0,30}\b(?:weak|giving way|can't walk)\b/i,
    },
    {
      ruleId: 'RF_CHEST',
      label: 'Chest pain',
      pattern: /\b(?:i have|having|new) chest pain\b/i,
    },
    {
      ruleId: 'RF_BREATH',
      label: 'Breathing difficulty',
      pattern: /\b(?:can't breathe|short of breath|struggling to breathe)\b/i,
    },
  ];
  const matched = phrases.find(({ pattern }) => pattern.test(answer.text));
  if (matched) {
    return {
      ruleId: matched.ruleId,
      label: matched.label,
      sourceMessageId: answer.id,
    };
  }
  return undefined;
}

function addFact(
  session: Session,
  answer: Message,
  asked: Question | undefined,
) {
  if (!asked || asked.slot === 'redflag') return;
  const quote = answer.text.trim();
  if (!quote) return;
  const status: SlotFact['status'] =
    answer.choiceId === 'not_sure'
      ? 'unsure'
      : answer.choiceId === 'no' || answer.choiceId === 'none'
        ? 'denied'
        : 'answered';
  session.facts = session.facts.filter((fact) => fact.slot !== asked.slot);
  session.facts.push({
    slot: asked.slot,
    value: quote,
    status,
    sourceMessageIds: [answer.id],
    quote,
  });
}

function summaryFor(session: Session): ClinicianSummary {
  if (session.id === mockConfirmedSummary.sessionId)
    return mockConfirmedSummary;

  const lines = session.facts.map((fact) => ({
    text: `Patient reported: ${fact.value}`,
    slot: fact.slot,
    sourceMessageIds: fact.sourceMessageIds,
    quotes: [fact.quote],
    verified: fact.sourceMessageIds.some((id) =>
      session.messages.some(
        (message) =>
          message.id === id &&
          message.role === 'patient' &&
          message.text.includes(fact.quote),
      ),
    ),
  }));
  return {
    sessionId: session.id,
    redFlags: session.redFlags,
    headline: lines
      .filter((line) => line.verified)
      .slice(0, 3)
      .map((line) => line.text),
    lines,
    notAsked: slots.filter(
      (slot) => !session.facts.some((fact) => fact.slot === slot),
    ),
    unsure: session.facts
      .filter((fact) => fact.status === 'unsure')
      .map((fact) => fact.slot),
    clarify: [],
    aiLabel: 'AI-drafted from patient answers. Verify before use.',
    generatedAt: new Date().toISOString(),
  };
}

/** Isolated mock backend. Pass delayMs: 0 in tests. */
export function createMockApi({
  delayMs = 300,
}: { delayMs?: number } = {}): ApiClient {
  const sessions = new Map(
    mockSessions.map((session) => [session.id, structuredClone(session)]),
  );
  const feedback = new Map<string, { lineIndex: number; note: string }[]>();
  const recapEdits = new Map<string, Map<SocratesSlot, string>>();

  async function wait() {
    if (delayMs > 0)
      await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  function get(id: string): Session {
    const session = sessions.get(id);
    if (!session) throw new Error(`Mock session ${id} was not found`);
    return session;
  }

  return {
    async createSession(body) {
      await wait();
      const input = CreateSessionRequestSchema.parse(body);
      const session: Session = {
        id: `mock-${nanoid()}`,
        appointment: input.appointment,
        lang: input.lang,
        carerMode: input.carerMode,
        status: 'in_progress',
        marks: [],
        messages: [],
        facts: [],
        askedQuestionIds: [],
        redFlags: [],
        createdAt: new Date().toISOString(),
      };
      const firstTurn = questionTurn(session, question('Q_OPEN'));
      sessions.set(session.id, session);
      return CreateSessionResponseSchema.parse({ session, firstTurn });
    },

    async getSession(id) {
      await wait();
      return GetSessionResponseSchema.parse({ session: get(id) });
    },

    async putMarks(id, body) {
      await wait();
      const input = PutMarksRequestSchema.parse(body);
      const session = get(id);
      session.marks = input.marks;
      if (input.snapshots) session.bodySnapshots = input.snapshots;
      return PutMarksResponseSchema.parse({ ok: true });
    },

    async postMessage(id, body) {
      await wait();
      const input = PostMessageRequestSchema.parse(body);
      const session = get(id);
      if (session.status !== 'in_progress') {
        throw new Error('This mock session is no longer accepting messages');
      }
      const asked = lastQuestion(session);
      const option = asked?.options?.find((item) => item.id === input.choiceId);
      if (input.choiceId && !option)
        throw new Error('Unknown choice for the current question');
      const answer: Message = {
        id: nanoid(),
        role: 'patient',
        text: input.text.trim() || option?.label[session.lang] || '',
        choiceId: input.choiceId,
        inputMode: input.inputMode ?? (input.choiceId ? 'choice' : 'text'),
        createdAt: new Date().toISOString(),
      };
      if (!answer.text) throw new Error('A message or choice is required');
      session.messages.push(answer);

      const hit = safetyHit(answer, asked);
      let turn: AssistantTurn;
      if (hit) {
        session.redFlags.push(hit);
        session.status = 'redflag_stopped';
        turn = { type: 'redflag_stop', hits: [hit] };
      } else {
        addFact(session, answer, asked);
        const next = nextQuestion(session);
        if (next) {
          turn = questionTurn(session, next);
        } else {
          session.status = 'awaiting_confirm';
          turn = { type: 'done' };
        }
      }
      return PostMessageResponseSchema.parse({ turn, session });
    },

    async getRecap(id) {
      await wait();
      const session = get(id);
      const edits = recapEdits.get(id);
      const lines = session.facts.map((fact) => ({
        text:
          edits?.get(fact.slot) ??
          (fact.status === 'unsure'
            ? `You said you are not sure: ${fact.quote}`
            : `You said: ${fact.quote}`),
        slot: fact.slot,
        editable: true as const,
      }));
      return GetRecapResponseSchema.parse({ lines });
    },

    async confirm(id, body) {
      await wait();
      const input = ConfirmRequestSchema.parse(body);
      const session = get(id);
      if (
        session.status !== 'awaiting_confirm' &&
        session.status !== 'confirmed'
      ) {
        throw new Error('This mock session is not ready to confirm');
      }
      const edits = recapEdits.get(id) ?? new Map<SocratesSlot, string>();
      input.edits?.forEach((edit) => edits.set(edit.slot, edit.text));
      recapEdits.set(id, edits);
      session.status = 'confirmed';
      return ConfirmResponseSchema.parse({ ok: true });
    },

    async getSummary(id) {
      await wait();
      return GetSummaryResponseSchema.parse({ summary: summaryFor(get(id)) });
    },

    async postFeedback(id, body) {
      await wait();
      const input = PostFeedbackRequestSchema.parse(body);
      if (input.lineIndex >= summaryFor(get(id)).lines.length) {
        throw new Error('Summary line does not exist');
      }
      feedback.set(id, [...(feedback.get(id) ?? []), input]);
      return PostFeedbackResponseSchema.parse({ ok: true });
    },

    async getClinicQueue() {
      await wait();
      const items = [...sessions.values()]
        .sort((a, b) => {
          const flagOrder =
            Number(b.redFlags.length > 0) - Number(a.redFlags.length > 0);
          return (
            flagOrder ||
            a.appointment.startsAt.localeCompare(b.appointment.startsAt)
          );
        })
        .map((session) => ({
          sessionId: session.id,
          patientDisplayName: session.appointment.patientDisplayName,
          startsAt: session.appointment.startsAt,
          status: session.status,
          redFlag: session.redFlags.length > 0,
        }));
      return GetClinicQueueResponseSchema.parse({ items });
    },
  };
}

export const mockApi: ApiClient = createMockApi();
