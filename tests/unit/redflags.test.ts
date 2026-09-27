import { describe, expect, it } from 'vitest';
import type { Message } from '@/contracts/types';
import { questionBank } from '@/server/questions/bank';
import { checkRedFlags, redFlagRules } from '@/server/redflags/check';

function message(text: string, extra: Partial<Message> = {}): Message {
  return {
    id: 'synthetic-answer',
    role: 'patient',
    text,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...extra,
  };
}

const textCases = [
  {
    id: 'RF_CAUDA_SADDLE',
    positive: [
      'My groin is numb.',
      'I have no feeling around my bottom.',
      'Pins and needles in my inner thighs.',
      'I cannot feel between my legs.',
    ],
    negative: [
      'My toes are numb.',
      'No numbness around my groin.',
      'My fingers are numb, not my groin.',
    ],
  },
  {
    id: 'RF_CAUDA_BLADDER',
    positive: [
      "I can't pee.",
      'I wet myself last night.',
      'I have trouble passing urine.',
      'I am unable to urinate.',
    ],
    negative: [
      'I can pee normally.',
      "I don't have trouble passing urine.",
      'No bowel incontinence.',
    ],
  },
  {
    id: 'RF_BILATERAL',
    positive: [
      'Both legs feel weak.',
      'Both my legs are giving way.',
      'Weakness in both legs.',
    ],
    negative: [
      'Only my left leg feels weak.',
      "Both legs hurt but aren't weak.",
      'No weakness in both legs.',
    ],
  },
  {
    id: 'RF_CHEST',
    positive: [
      'I have chest pain.',
      'Pain in my chest started today.',
      'My chest feels tight.',
      'There is tightness in my chest.',
    ],
    negative: [
      'I do not have chest pain.',
      'My chest is bruised but I have no chest pain.',
      'My shoulder hurts near the chest.',
    ],
  },
  {
    id: 'RF_BREATH',
    positive: [
      "I can't breathe.",
      'I am short of breath.',
      'Difficulty breathing after walking.',
      "I can't get enough air.",
    ],
    negative: [
      'I am not short of breath.',
      'No difficulty breathing.',
      'I breathe normally.',
    ],
  },
] as const;

describe('deterministic red-flag rules', () => {
  it('loads the seven uniquely named rules', () => {
    expect(redFlagRules).toHaveLength(7);
    expect(new Set(redFlagRules.map((rule) => rule.id)).size).toBe(7);
  });

  for (const { id, positive, negative } of textCases) {
    it.each(positive)(`${id} detects: %s`, (text) => {
      expect(checkRedFlags(message(text)).map((hit) => hit.ruleId)).toContain(
        id,
      );
    });
    it.each(negative)(`${id} ignores: %s`, (text) => {
      expect(
        checkRedFlags(message(text)).map((hit) => hit.ruleId),
      ).not.toContain(id);
    });
  }

  it('checks the original Arabic text and translated English text', () => {
    expect(
      checkRedFlags(message('لدي ألم في الصدر')).map((hit) => hit.ruleId),
    ).toContain('RF_CHEST');
    expect(
      checkRedFlags(message('لا أستطيع التبول')).map((hit) => hit.ruleId),
    ).toContain('RF_CAUDA_BLADDER');
    expect(
      checkRedFlags(
        message('ظهري يؤلمني', { textEn: 'I have chest pain.' }),
      ).map((hit) => hit.ruleId),
    ).toContain('RF_CHEST');
  });

  it('recognises a positive symptom after an earlier denial', () => {
    expect(
      checkRedFlags(
        message('I had no chest pain before, but now I have chest pain.'),
      ).map((hit) => hit.ruleId),
    ).toContain('RF_CHEST');
  });

  it.each(['RF_SADDLE', 'RF_BLADDER', 'RF_BILAT_WEAK'])(
    '%s stops for yes and not_sure, but not no',
    (id) => {
      const question = questionBank.find((item) => item.id === id)!;
      for (const choiceId of ['yes', 'not_sure']) {
        expect(
          checkRedFlags(message('', { choiceId }), question).map(
            (hit) => hit.ruleId,
          ),
        ).toContain('RF_MANDATORY_YES');
      }
      expect(checkRedFlags(message('', { choiceId: 'no' }), question)).toEqual(
        [],
      );
    },
  );

  it('stops for systemic choices, uncertainty, and typed affirmative answers', () => {
    const question = questionBank.find(
      (item) => item.id === 'RF_FEVER_TRAUMA',
    )!;
    for (const choiceId of [
      'fever',
      'recent_fall_or_injury',
      'history_of_cancer',
      'unexplained_weight_loss',
      'not_sure',
    ]) {
      expect(
        checkRedFlags(message('', { choiceId }), question).map(
          (hit) => hit.ruleId,
        ),
      ).toContain('RF_SYSTEMIC');
    }
    expect(
      checkRedFlags(message('حمى'), question).map((hit) => hit.ruleId),
    ).toContain('RF_SYSTEMIC');
    expect(
      checkRedFlags(message('نعم'), question).map((hit) => hit.ruleId),
    ).toContain('RF_SYSTEMIC');
    expect(checkRedFlags(message('', { choiceId: 'none' }), question)).toEqual(
      [],
    );
  });

  it('does not trigger for 20 benign synthetic pain-history phrases', () => {
    const benign = [
      'My lower back aches when I sit.',
      'The pain started a few days ago.',
      'My right shoulder is sore after swimming.',
      'My left knee hurts on stairs.',
      'My ankle is swollen after a run.',
      'I have pain in one hip.',
      'It is a dull ache in my neck.',
      'The discomfort comes and goes.',
      'Rest makes my back feel better.',
      'My wrist hurts when I type.',
      'I took paracetamol yesterday.',
      'The pain is about four out of ten.',
      'My fingers tingle sometimes.',
      'My toes are numb after tight shoes.',
      'Only my left leg feels weak after exercise.',
      'I have no chest pain.',
      'I am not short of breath.',
      'No numbness around my groin.',
      "I don't have trouble passing urine.",
      'Both legs hurt after hiking but are not weak.',
    ];
    expect(benign).toHaveLength(20);
    for (const text of benign) {
      expect(checkRedFlags(message(text)), text).toEqual([]);
    }
  });
});
