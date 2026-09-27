import { describe, expect, it } from 'vitest';
import { QuestionBankSchema, questionBank } from '@/server/questions/bank';

describe('B-02 question bank', () => {
  it('has 34 valid bilingual questions, every history slot, and the mandatory red flags', () => {
    expect(questionBank).toHaveLength(34);
    expect(QuestionBankSchema.parse(questionBank)).toEqual(questionBank);
    expect(
      questionBank
        .filter((question) => question.mandatory)
        .map((question) => question.id),
    ).toEqual(['RF_SADDLE', 'RF_BLADDER', 'RF_BILAT_WEAK', 'RF_FEVER_TRAUMA']);
  });

  it('rejects duplicate IDs and missing history slots', () => {
    const duplicate = structuredClone(questionBank);
    duplicate.push(duplicate[0]!);
    expect(QuestionBankSchema.safeParse(duplicate).success).toBe(false);

    const missing = questionBank.filter(
      (question) => question.slot !== 'radiation',
    );
    expect(QuestionBankSchema.safeParse(missing).success).toBe(false);
  });

  it('rejects blank translations, incomplete choices, and unknown region groups', () => {
    const blank = structuredClone(questionBank);
    blank[0]!.text.ar = '   ';
    expect(QuestionBankSchema.safeParse(blank).success).toBe(false);

    const incomplete = structuredClone(questionBank);
    const onset = incomplete.find((question) => question.id === 'Q_ONSET')!;
    onset.options = onset.options?.filter((option) => option.id !== 'not_sure');
    expect(QuestionBankSchema.safeParse(incomplete).success).toBe(false);

    const unknownGroup = structuredClone(questionBank);
    unknownGroup[0]!.appliesTo = ['unknown'];
    expect(QuestionBankSchema.safeParse(unknownGroup).success).toBe(false);
  });
});
