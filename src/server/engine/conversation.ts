import { nanoid } from 'nanoid';
import { REGIONS } from '@/contracts/regions';
import type { PostMessageRequest } from '@/contracts/api';
import type {
  AssistantTurn,
  Message,
  Question,
  Session,
  SlotFact,
  SocratesSlot,
} from '@/contracts/types';
import { questionBank } from '@/server/questions/bank';
import { checkRedFlags } from '@/server/redflags/check';

const MAX_QUESTIONS = 8;
const REQUIRED: SocratesSlot[] = [
  'site',
  'onset',
  'character',
  'radiation',
  'exacerbating',
  'timing',
  'severity',
];
const PRIORITY: SocratesSlot[] = [
  'site',
  'onset',
  'character',
  'radiation',
  'severity',
  'exacerbating',
  'timing',
  'associated',
  'relieving',
  'meds_tried',
];

export interface EngineDependencies {
  translate?: (text: string) => Promise<string>;
  extract?: (
    message: Message,
    session: Session,
    lastQuestion: Question,
  ) => Promise<SlotFact[]>;
  select?: (
    candidates: Question[],
    session: Session,
  ) => Promise<string | undefined>;
  now?: () => string;
  id?: () => string;
}

const bankById = new Map(
  questionBank.map((question) => [question.id, question]),
);

function regionGroups(session: Session): Set<string> {
  const byId = new Map(REGIONS.map((region) => [region.id, region.group]));
  return new Set(
    session.marks
      .map((mark) => byId.get(mark.regionId))
      .filter((group): group is NonNullable<typeof group> => Boolean(group)),
  );
}

function applies(question: Question, groups: Set<string>): boolean {
  // Unknown location receives every mandatory safety question.
  return (
    !question.appliesTo ||
    groups.size === 0 ||
    question.appliesTo.some((group) => groups.has(group))
  );
}

function mandatoryRemaining(session: Session): Question[] {
  const groups = regionGroups(session);
  return questionBank.filter(
    (question) =>
      question.mandatory &&
      applies(question, groups) &&
      !session.askedQuestionIds.includes(question.id),
  );
}

function clean(text: string): string {
  return text
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/\s+/gu, ' ')
    .trim();
}

function supported(fact: SlotFact, message: Message): boolean {
  return (
    fact.sourceMessageIds.includes(message.id) &&
    Boolean(fact.quote.trim()) &&
    [message.text, message.textEn].some(
      (text) => Boolean(text) && clean(text!).includes(clean(fact.quote)),
    )
  );
}

function directFact(message: Message, question: Question): SlotFact[] {
  if (question.slot === 'redflag') return [];
  const quote = message.text.trim();
  if (!quote) return [];
  const status: SlotFact['status'] =
    message.choiceId === 'not_sure'
      ? 'unsure'
      : message.choiceId === 'no' || message.choiceId === 'none'
        ? 'denied'
        : 'answered';
  return [
    {
      slot: question.slot,
      value: quote,
      status,
      sourceMessageIds: [message.id],
      quote,
    },
  ];
}

function fallback(candidates: Question[]): Question | undefined {
  return [...candidates].sort(
    (a, b) =>
      PRIORITY.indexOf(a.slot as SocratesSlot) -
      PRIORITY.indexOf(b.slot as SocratesSlot),
  )[0];
}

function ask(
  session: Session,
  question: Question,
  deps: EngineDependencies,
): AssistantTurn {
  const message: Message = {
    id: deps.id?.() ?? nanoid(),
    role: 'assistant',
    text: question.text[session.lang],
    questionId: question.id,
    createdAt: deps.now?.() ?? new Date().toISOString(),
  };
  session.messages.push(message);
  session.askedQuestionIds.push(question.id);
  return {
    type: 'question',
    message,
    question,
    progress: {
      asked: session.askedQuestionIds.length,
      estimatedTotal: MAX_QUESTIONS,
    },
  };
}

/** Add the initial bank question to a newly created session. */
export function startConversation(
  session: Session,
  deps: EngineDependencies = {},
): { session: Session; turn: AssistantTurn } {
  if (session.status !== 'in_progress' || session.messages.length > 0) {
    throw new Error('Conversation has already started');
  }
  const next = structuredClone(session);
  const first = bankById.get('Q_OPEN');
  if (!first) throw new Error('Q_OPEN is missing from the question bank');
  return { session: next, turn: ask(next, first, deps) };
}

/** Safety check always runs before extraction or question selection. */
export async function handlePatientMessage(
  session: Session,
  input: PostMessageRequest,
  deps: EngineDependencies = {},
): Promise<{ session: Session; turn: AssistantTurn }> {
  if (session.status !== 'in_progress')
    throw new Error('Session is not accepting messages');
  const last = session.messages.at(-1);
  const question =
    last?.role === 'assistant' && last.questionId
      ? bankById.get(last.questionId)
      : undefined;
  if (!question) throw new Error('No unanswered question exists');
  const option = question.options?.find((item) => item.id === input.choiceId);
  if (input.choiceId && !option)
    throw new Error('Unknown choice for current question');
  const answerText = input.text.trim() || option?.label[session.lang] || '';
  if (!answerText) throw new Error('A message or choice is required');

  const next = structuredClone(session);
  const answer: Message = {
    id: deps.id?.() ?? nanoid(),
    role: 'patient',
    text: answerText,
    choiceId: input.choiceId,
    inputMode: input.inputMode ?? (input.choiceId ? 'choice' : 'text'),
    createdAt: deps.now?.() ?? new Date().toISOString(),
  };
  next.messages.push(answer);
  if (next.lang !== 'en' && deps.translate) {
    try {
      answer.textEn = await deps.translate(answer.text);
    } catch {
      // Screen the original words even when translation is unavailable.
    }
  }

  const hits = checkRedFlags(answer, question);
  if (hits.length) {
    next.redFlags.push(...hits);
    next.status = 'redflag_stopped';
    return { session: next, turn: { type: 'redflag_stop', hits } };
  }

  const extracted = deps.extract
    ? await deps.extract(answer, next, question)
    : directFact(answer, question);
  for (const fact of extracted.filter((item) => supported(item, answer))) {
    next.facts = next.facts.filter((old) => old.slot !== fact.slot);
    next.facts.push(fact);
  }

  const remaining = mandatoryRemaining(next);
  const filled = new Set(
    next.facts
      .filter((fact) => fact.status === 'answered')
      .map((fact) => fact.slot),
  );
  if (
    !remaining.length &&
    (REQUIRED.every((slot) => filled.has(slot)) ||
      next.askedQuestionIds.length >= MAX_QUESTIONS)
  ) {
    next.status = 'awaiting_confirm';
    return { session: next, turn: { type: 'done' } };
  }

  // Reserve enough of the remaining budget to ask every applicable mandatory question.
  const due =
    remaining.length &&
    (next.askedQuestionIds.length >= 2 ||
      MAX_QUESTIONS - next.askedQuestionIds.length <= remaining.length)
      ? remaining[0]
      : undefined;
  if (due) return { session: next, turn: ask(next, due, deps) };

  const groups = regionGroups(next);
  const candidates = questionBank.filter(
    (candidate) =>
      !candidate.mandatory &&
      applies(candidate, groups) &&
      !next.askedQuestionIds.includes(candidate.id) &&
      !filled.has(candidate.slot as SocratesSlot),
  );
  let selected: Question | undefined;
  if (candidates.length && deps.select) {
    try {
      const id = await deps.select(candidates, next);
      selected = candidates.find((candidate) => candidate.id === id);
    } catch {
      // An unavailable selector must not stop the check-in.
    }
  }
  selected ??= fallback(candidates);
  if (!selected) {
    next.status = 'awaiting_confirm';
    return { session: next, turn: { type: 'done' } };
  }
  return { session: next, turn: ask(next, selected, deps) };
}
