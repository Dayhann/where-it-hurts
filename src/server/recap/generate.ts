import { PatientRecapLineSchema } from '@/contracts/schemas';
import type {
  PatientRecapLine,
  Session,
  SocratesSlot,
} from '@/contracts/types';
import { verifyLine } from '@/server/summary/validate';
import { questionBank } from '@/server/questions/bank';

const TOPIC: Record<SocratesSlot, string> = {
  site: 'where it hurts',
  onset: 'when it started',
  character: 'how it feels',
  radiation: 'whether it spreads',
  associated: 'anything else you noticed',
  timing: 'when you feel it',
  exacerbating: 'what makes it feel worse',
  relieving: 'what makes it feel better',
  severity: 'how strong it feels',
  meds_tried: 'what you tried for it',
};

const CLINICAL_JARGON =
  /\b(?:radiculopathy|paraesthesia|paresthesia|dysuria|erythema|bilateral|exacerbation|exacerbating|radiation)\b/iu;

function sentence(text: string): string {
  const trimmed = text.trim().replace(/\s+/gu, ' ');
  return /[.!?]$/u.test(trimmed) ? trimmed : `${trimmed}.`;
}

/** Plain-language patient recap from quote-supported facts only. */
export function generateRecap(session: Session): PatientRecapLine[] {
  const latestBySlot = new Map(session.facts.map((fact) => [fact.slot, fact]));
  return [...latestBySlot.values()]
    .filter(
      (fact) =>
        verifyLine(
          {
            text: fact.quote,
            slot: fact.slot,
            sourceMessageIds: fact.sourceMessageIds,
            quotes: [fact.quote],
            verified: false,
          },
          session.messages,
        ).verified,
    )
    .map((fact) =>
      PatientRecapLineSchema.parse({
        slot: fact.slot,
        text:
          fact.status === 'unsure'
            ? `You weren't sure about ${TOPIC[fact.slot]}.`
            : CLINICAL_JARGON.test(fact.quote)
              ? `You mentioned ${TOPIC[fact.slot]}. Please check the wording before you send this.`
              : `You said this about ${TOPIC[fact.slot]}: ${sentence(fact.quote)}`,
        editable: true,
      }),
    );
}

/** Review every answer to a history question, including repeated topics. */
export function generateAnswerRecap(session: Session): PatientRecapLine[] {
  const questions = new Map(
    questionBank.map((question) => [question.id, question]),
  );
  const lines = session.messages.flatMap((message, index) => {
    if (message.role !== 'patient') return [];
    const previous = session.messages[index - 1];
    const question = previous?.questionId
      ? questions.get(previous.questionId)
      : undefined;
    if (!question || question.slot === 'redflag') return [];
    const topic = TOPIC[question.slot];
    return [
      PatientRecapLineSchema.parse({
        slot: question.slot,
        text:
          message.choiceId === 'not_sure'
            ? `You weren't sure about ${topic}.`
            : CLINICAL_JARGON.test(message.text)
              ? `You mentioned ${topic}. Please check the wording before you send this.`
              : `You said this about ${topic}: ${sentence(message.text)}`,
        editable: true,
      }),
    ];
  });
  return lines.length ? lines : generateRecap(session);
}
