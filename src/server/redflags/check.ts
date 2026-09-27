import { z } from 'zod';
import type { Message, Question, RedFlagHit } from '@/contracts/types';
import ruleData from '../../../data/red-flag-rules.json';

const NonEmptyTerms = z.array(z.string().trim().min(1)).min(1);
const RuleSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    anyOf: NonEmptyTerms.optional(),
    allOf: z.array(NonEmptyTerms).min(2).optional(),
    questionAnswer: z
      .object({
        questionIds: NonEmptyTerms,
        choiceIds: NonEmptyTerms,
      })
      .optional(),
  })
  .refine(
    (rule) =>
      Number(Boolean(rule.anyOf)) +
        Number(Boolean(rule.allOf)) +
        Number(Boolean(rule.questionAnswer)) ===
      1,
    'Each red-flag rule needs exactly one matcher',
  );

const RedFlagRulesSchema = z
  .array(RuleSchema)
  .min(1)
  .superRefine((rules, ctx) => {
    const ids = new Set<string>();
    rules.forEach((rule, index) => {
      if (ids.has(rule.id)) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'id'],
          message: 'Duplicate red-flag rule ID',
        });
      }
      ids.add(rule.id);
    });
  });

export const redFlagRules = RedFlagRulesSchema.parse(ruleData);

function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

function isNegated(text: string, start: number): boolean {
  const before =
    text
      .slice(Math.max(0, start - 48), start)
      .split(/[.!?;،؛]|\b(?:but|however|though)\b|لكن/u)
      .at(-1) ?? '';
  const match = before.match(
    /(?:^|\s)(?:no|not|never|without|deny|denies|denied|don'?t|do not|did not|isn'?t|wasn'?t|aren'?t|are not|لا|ليس|بدون|ما عندي)(?:\s+\S+){0,3}\s*$/u,
  );
  // "No feeling in my groin" describes lost sensation, not a denial.
  return Boolean(match && !/^\s*no feeling\b/u.test(match[0]));
}

function termPositions(text: string, term: string): number[] {
  const escaped = normalize(term)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
    'gu',
  );
  return [...text.matchAll(pattern)]
    .map((match) => match.index)
    .filter((start) => !isNegated(text, start));
}

function matchesText(
  text: string,
  rule: (typeof redFlagRules)[number],
): boolean {
  if (rule.anyOf) {
    return rule.anyOf.some((term) => termPositions(text, term).length > 0);
  }
  if (rule.allOf) {
    const groups = rule.allOf.map((terms) =>
      terms.flatMap((term) => termPositions(text, term)),
    );
    if (groups.some((positions) => positions.length === 0)) return false;
    // Keep symptom and body location close enough to describe one statement.
    return groups[0]!.some((first) =>
      groups
        .slice(1)
        .every((positions) =>
          positions.some((position) => Math.abs(position - first) <= 100),
        ),
    );
  }
  return false;
}

function choiceFromAnswer(
  answer: Message,
  question: Question,
): string | undefined {
  if (answer.choiceId) return answer.choiceId;
  const text = normalize(answer.text);
  if (/^(?:yes|yes i do|yeah|yep|نعم|ايوه)$/u.test(text)) return 'yes';
  if (
    /^(?:not sure|i'?m not sure|i don'?t know|لست متاكدا|غير متاكد)$/u.test(
      text,
    )
  ) {
    return 'not_sure';
  }
  return question.options?.find(
    (option) =>
      text === normalize(option.label.en) ||
      text === normalize(option.label.ar),
  )?.id;
}

/** Run on every patient message before extraction or any LLM call. */
export function checkRedFlags(
  answer: Message,
  lastQuestion?: Question,
): RedFlagHit[] {
  if (answer.role !== 'patient') return [];
  const texts = [answer.text, answer.textEn]
    .filter((text): text is string => Boolean(text?.trim()))
    .map(normalize);
  const choiceId = lastQuestion?.mandatory
    ? choiceFromAnswer(answer, lastQuestion)
    : undefined;

  return redFlagRules
    .filter((rule) => {
      if (rule.questionAnswer) {
        return Boolean(
          lastQuestion?.mandatory &&
          rule.questionAnswer.questionIds.includes(lastQuestion.id) &&
          (rule.questionAnswer.choiceIds.includes(choiceId ?? '') ||
            choiceId === 'yes'),
        );
      }
      return texts.some((text) => matchesText(text, rule));
    })
    .map((rule) => ({
      ruleId: rule.id,
      label: rule.label,
      sourceMessageId: answer.id,
    }));
}
