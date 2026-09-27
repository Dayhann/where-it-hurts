import { nanoid } from 'nanoid';
import { REGIONS, REGION_BY_ID } from '@/contracts/regions';
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

function applies(
  question: Question,
  groups: Set<string>,
  unknownMatches: boolean,
): boolean {
  return (
    !question.appliesTo ||
    (unknownMatches && groups.size === 0) ||
    question.appliesTo.some((group) => groups.has(group))
  );
}

function mandatoryRemaining(session: Session): Question[] {
  const groups = regionGroups(session);
  return questionBank.filter(
    (question) =>
      question.mandatory &&
      applies(question, groups, true) &&
      !session.askedQuestionIds.includes(question.id),
  );
}

function renderQuestion(question: Question, session: Session): Question {
  if (!question.text.en.includes('{marked_areas}')) return question;
  const relevant =
    question.appliesTo?.length === 1
      ? session.marks.filter((mark) =>
          question.appliesTo?.includes(
            REGION_BY_ID[mark.regionId]?.group ?? '',
          ),
        )
      : session.marks;
  const preferred = relevant.some((mark) => mark.kind === 'pain')
    ? relevant.filter((mark) => mark.kind === 'pain')
    : relevant;
  const regions = [...new Set(preferred.map((mark) => mark.regionId))]
    .map((id) => REGION_BY_ID[id])
    .filter((region) => Boolean(region));
  const areaText = (lang: Session['lang']) => {
    const labels = regions.slice(0, 3).map((region) => region.label[lang]);
    const more =
      regions.length > 3
        ? lang === 'ar'
          ? '، ومناطق أخرى'
          : ', and other areas'
        : '';
    return `${labels.join(lang === 'ar' ? '، ' : ', ')}${more}`;
  };
  return {
    ...question,
    text: {
      en: question.text.en.replace('{marked_areas}', areaText('en')),
      ar: question.text.ar.replace('{marked_areas}', areaText('ar')),
    },
  };
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

/** Restore literal answers from older sessions whose model extraction failed. */
export function withRecoveredFacts(session: Session): Session {
  const existingSlots = new Set(session.facts.map((fact) => fact.slot));
  const recovered = new Map<SocratesSlot, SlotFact>();
  session.messages.forEach((message, index) => {
    if (message.role !== 'patient') return;
    const previous = session.messages[index - 1];
    const question = previous?.questionId
      ? bankById.get(previous.questionId)
      : undefined;
    if (
      !question ||
      question.slot === 'redflag' ||
      existingSlots.has(question.slot)
    )
      return;
    const fact = directFact(message, question)[0];
    if (fact) recovered.set(fact.slot, fact);
  });
  return {
    ...session,
    facts: [...session.facts, ...recovered.values()],
  };
}

function fallback(candidates: Question[]): Question | undefined {
  return [...candidates].sort((a, b) => {
    const priority =
      PRIORITY.indexOf(a.slot as SocratesSlot) -
      PRIORITY.indexOf(b.slot as SocratesSlot);
    if (priority) return priority;
    return (
      Number(Boolean(b.appliesTo?.length)) -
      Number(Boolean(a.appliesTo?.length))
    );
  })[0];
}

function ask(
  session: Session,
  question: Question,
  deps: EngineDependencies,
): AssistantTurn {
  const rendered = renderQuestion(question, session);
  const message: Message = {
    id: deps.id?.() ?? nanoid(),
    role: 'assistant',
    text: rendered.text[session.lang],
    questionId: question.id,
    createdAt: deps.now?.() ?? new Date().toISOString(),
  };
  session.messages.push(message);
  session.askedQuestionIds.push(question.id);
  return {
    type: 'question',
    message,
    question: rendered,
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
  const bankQuestion =
    last?.role === 'assistant' && last.questionId
      ? bankById.get(last.questionId)
      : undefined;
  if (!bankQuestion) throw new Error('No unanswered question exists');
  const question = renderQuestion(bankQuestion, session);
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
  const supportedFacts = extracted.filter((item) => supported(item, answer));
  // If extraction is unavailable, retain the patient's exact answer as a
  // literal fact for the recap. This adds no clinical interpretation.
  for (const fact of supportedFacts.length
    ? supportedFacts
    : directFact(answer, question)) {
    next.facts = next.facts.filter((old) => old.slot !== fact.slot);
    next.facts.push(fact);
  }

  const remaining = mandatoryRemaining(next);
  const covered = new Set(
    next.facts
      .filter((fact) => fact.status !== 'unsure')
      .map((fact) => fact.slot),
  );
  if (
    !remaining.length &&
    (REQUIRED.every((slot) => covered.has(slot)) ||
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
      applies(candidate, groups, false) &&
      !next.askedQuestionIds.includes(candidate.id) &&
      !covered.has(candidate.slot as SocratesSlot),
  );
  // Ask one question grounded in the selected areas while there is room in the
  // budget. The model still chooses only a bank ID, and mandatory screens remain.
  const markedCandidates = next.askedQuestionIds.some((id) =>
    id.startsWith('Q_MARKED_'),
  )
    ? []
    : candidates.filter((candidate) => candidate.id.startsWith('Q_MARKED_'));
  const regionSpecific = candidates.filter((candidate) =>
    candidate.id.startsWith('Q_REGION_'),
  );
  const specific = [...markedCandidates, ...regionSpecific]
    .filter((candidate) => candidate.appliesTo?.length === 1)
    .sort((a, b) => {
      const firstMarkIndex = (question: Question) =>
        next.marks.findIndex((mark) =>
          question.appliesTo?.includes(
            REGION_BY_ID[mark.regionId]?.group ?? '',
          ),
        );
      return firstMarkIndex(a) - firstMarkIndex(b);
    });
  const contextual = specific.length ? specific : markedCandidates;
  const offered = (contextual.length ? contextual : candidates).map(
    (candidate) => renderQuestion(candidate, next),
  );
  let selected: Question | undefined;
  if (offered.length && deps.select) {
    try {
      const id = await deps.select(offered, next);
      selected = offered.find((candidate) => candidate.id === id);
    } catch {
      // An unavailable selector must not stop the check-in.
    }
  }
  selected ??= fallback(offered);
  if (!selected) {
    next.status = 'awaiting_confirm';
    return { session: next, turn: { type: 'done' } };
  }
  return { session: next, turn: ask(next, selected, deps) };
}
