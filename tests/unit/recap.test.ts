import { describe, expect, it } from 'vitest';
import type { Session, SlotFact, SocratesSlot } from '@/contracts/types';
import { generateAnswerRecap, generateRecap } from '@/server/recap/generate';

function session(facts: SlotFact[]): Session {
  return {
    id: 'synthetic-recap-session',
    appointment: {
      patientDisplayName: 'Demo patient',
      clinician: 'Demo clinician',
      startsAt: '2026-01-01T10:00:00Z',
    },
    lang: 'en',
    carerMode: false,
    status: 'awaiting_confirm',
    marks: [],
    messages: facts.map((fact, index) => ({
      id: `p${index}`,
      role: 'patient' as const,
      text: fact.quote,
      createdAt: '2026-01-01T09:00:00Z',
    })),
    facts: facts.map((fact, index) => ({
      ...fact,
      sourceMessageIds: [`p${index}`],
    })),
    askedQuestionIds: [],
    redFlags: [],
    createdAt: '2026-01-01T09:00:00Z',
  };
}

function fact(
  slot: SocratesSlot,
  quote: string,
  status: SlotFact['status'] = 'answered',
): SlotFact {
  return {
    slot,
    value: 'clinical value intentionally ignored',
    status,
    sourceMessageIds: [],
    quote,
  };
}

describe('patient recap generator', () => {
  it('keeps repeated history answers in order and omits screening replies', () => {
    const input = session([]);
    input.messages = [
      {
        id: 'q1',
        role: 'assistant',
        questionId: 'Q_OPEN',
        text: "What's the issue?",
        createdAt: input.createdAt,
      },
      {
        id: 'p1',
        role: 'patient',
        text: 'My left knee aches.',
        createdAt: input.createdAt,
      },
      {
        id: 'q2',
        role: 'assistant',
        questionId: 'Q_SITE_DETAIL',
        text: 'Where most?',
        createdAt: input.createdAt,
      },
      {
        id: 'p2',
        role: 'patient',
        text: 'At the front of the knee.',
        createdAt: input.createdAt,
      },
      {
        id: 'q3',
        role: 'assistant',
        questionId: 'RF_FEVER_TRAUMA',
        text: 'Any of these?',
        createdAt: input.createdAt,
      },
      {
        id: 'p3',
        role: 'patient',
        text: 'None of these',
        choiceId: 'none',
        createdAt: input.createdAt,
      },
    ];
    const lines = generateAnswerRecap(input);
    expect(lines).toHaveLength(2);
    expect(lines.map((line) => line.slot)).toEqual(['site', 'site']);
    expect(lines[0]?.text).toContain('My left knee aches.');
    expect(lines[1]?.text).toContain('At the front of the knee.');
  });

  it('uses plain second-person labels and the patient quote for each slot', () => {
    const quotes: [SocratesSlot, string][] = [
      ['site', 'My lower back hurts'],
      ['onset', 'It started yesterday'],
      ['character', 'It feels sharp'],
      ['radiation', 'It goes down my leg'],
      ['associated', 'My ankle is swollen'],
      ['timing', 'It comes and goes'],
      ['exacerbating', 'Sitting makes it worse'],
      ['relieving', 'Rest helps'],
      ['severity', 'Six out of ten'],
      ['meds_tried', 'I tried a heat pack'],
    ];
    const lines = generateRecap(
      session(quotes.map(([slot, quote]) => fact(slot, quote))),
    );
    expect(lines).toHaveLength(10);
    lines.forEach((line, index) => {
      expect(line.text).toContain('You said');
      expect(line.text).toContain(quotes[index]![1]);
      expect(line.editable).toBe(true);
    });
    const banned =
      /\b(?:radiculopathy|paraesthesia|dysuria|exacerbating|bilateral|radiation)\b/iu;
    expect(lines.some((line) => banned.test(line.text))).toBe(false);
  });

  it('keeps uncertainty distinct from an explicit denial', () => {
    const lines = generateRecap(
      session([
        fact('radiation', 'Not sure', 'unsure'),
        fact('associated', 'No', 'denied'),
      ]),
    );
    expect(lines[0]?.text).toBe("You weren't sure about whether it spreads.");
    expect(lines[1]?.text).toBe(
      'You said this about anything else you noticed: No.',
    );
  });

  it('omits facts whose quote does not come from a cited patient message', () => {
    const input = session([fact('site', 'My knee hurts')]);
    input.facts[0]!.quote = 'My shoulder hurts';
    expect(generateRecap(input)).toEqual([]);
    input.facts[0]!.quote = 'My knee hurts';
    input.facts[0]!.sourceMessageIds = ['unknown'];
    expect(generateRecap(input)).toEqual([]);
  });

  it('uses only the latest fact for an edited slot and leaves missing slots absent', () => {
    const input = session([
      fact('site', 'My hip hurts'),
      fact('site', 'My knee hurts'),
    ]);
    expect(generateRecap(input)).toEqual([
      {
        slot: 'site',
        text: 'You said this about where it hurts: My knee hurts.',
        editable: true,
      },
    ]);
  });

  it('does not repeat clinical jargon from a patient quote', () => {
    const lines = generateRecap(
      session([fact('associated', 'I have paraesthesia')]),
    );
    expect(lines[0]?.text).toBe(
      'You mentioned anything else you noticed. Please check the wording before you send this.',
    );
    expect(lines[0]?.text).not.toContain('paraesthesia');
  });
});
