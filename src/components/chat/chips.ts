import type { Lang, Question, QuestionOption } from '@/contracts/types';

export const NOT_SURE: QuestionOption = {
  id: 'not_sure',
  label: { en: 'Not sure', ar: 'لست متأكداً' },
};

export const SOMETHING_ELSE: QuestionOption = {
  id: 'something_else',
  label: { en: 'Something else', ar: 'شيء آخر' },
};

/** Labels used only when getSession has no current question object. */
export const ONSET_FALLBACK_OPTIONS: QuestionOption[] = [
  { id: 'today', label: { en: 'Today', ar: 'اليوم' } },
  { id: 'days', label: { en: 'A few days ago', ar: 'قبل بضعة أيام' } },
  { id: 'weeks', label: { en: 'A few weeks ago', ar: 'قبل بضعة أسابيع' } },
  { id: 'months', label: { en: 'Months or longer', ar: 'قبل أشهر أو أكثر' } },
  NOT_SURE,
  SOMETHING_ELSE,
];

export const YES_NO_FALLBACK_OPTIONS: QuestionOption[] = [
  { id: 'yes', label: { en: 'Yes', ar: 'نعم' } },
  { id: 'no', label: { en: 'No', ar: 'لا' } },
  NOT_SURE,
  SOMETHING_ELSE,
];

export function replyChips(question: Question | undefined): QuestionOption[] {
  const options = [...(question?.options ?? [])];
  if (question?.kind === 'scale' && options.length === 0) {
    for (let score = 0; score <= 10; score += 1) {
      const label = String(score);
      options.push({ id: `scale_${score}`, label: { en: label, ar: label } });
    }
  }
  const ids = new Set(options.map((option) => option.id));
  if (!ids.has(NOT_SURE.id)) options.push(NOT_SURE);
  if (!ids.has(SOMETHING_ELSE.id)) options.push(SOMETHING_ELSE);
  return options;
}

export function optionLabel(option: QuestionOption, lang: Lang): string {
  return option.label[lang] ?? option.label.en;
}

export function payloadForChip(
  option: QuestionOption,
  lang: Lang,
  question?: Question,
): { text: string; choiceId?: string; inputMode: 'text' | 'choice' } {
  if (option.id.startsWith('scale_')) {
    return { text: option.id.slice('scale_'.length), inputMode: 'text' };
  }
  const known = question?.options?.some((item) => item.id === option.id);
  return {
    text: optionLabel(option, lang),
    choiceId: known ? option.id : undefined,
    inputMode: known ? 'choice' : 'text',
  };
}
