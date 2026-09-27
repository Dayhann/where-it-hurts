import { describe, expect, it } from 'vitest';
import type { Session, SummaryLine } from '@/contracts/types';
import type { LlmProvider } from '@/server/llm/provider';
import { summarisePrompt } from '@/server/llm/prompts/summarise';
import { generateSummary } from '@/server/summary/generate';
import { verifyLine } from '@/server/summary/validate';

function session(): Session {
  return {
    id: 'synthetic-summary-session',
    appointment: {
      patientDisplayName: 'Demo patient',
      clinician: 'Demo clinician',
      startsAt: '2026-01-01T10:00:00Z',
    },
    lang: 'en',
    carerMode: false,
    status: 'awaiting_confirm',
    marks: [],
    messages: [
      {
        id: 'a1',
        role: 'assistant',
        text: 'When did it start?',
        createdAt: '2026-01-01T09:00:00Z',
      },
      {
        id: 'p1',
        role: 'patient',
        text: 'My left lower back hurts when sitting',
        createdAt: '2026-01-01T09:01:00Z',
      },
      {
        id: 'p2',
        role: 'patient',
        text: 'It started yesterday; I am not sure if it spreads.',
        createdAt: '2026-01-01T09:02:00Z',
      },
    ],
    facts: [
      {
        slot: 'site',
        value: 'left lower back',
        status: 'answered',
        sourceMessageIds: ['p1'],
        quote: 'left lower back',
      },
      {
        slot: 'onset',
        value: 'yesterday',
        status: 'answered',
        sourceMessageIds: ['p2'],
        quote: 'yesterday',
      },
      {
        slot: 'radiation',
        value: 'not sure',
        status: 'unsure',
        sourceMessageIds: ['p2'],
        quote: 'not sure',
      },
      {
        slot: 'exacerbating',
        value: 'sitting',
        status: 'answered',
        sourceMessageIds: ['p1'],
        quote: 'sitting',
      },
    ],
    askedQuestionIds: [],
    redFlags: [],
    createdAt: '2026-01-01T09:00:00Z',
  };
}

function line(overrides: Partial<SummaryLine> = {}): SummaryLine {
  return {
    text: 'Left lower back pain',
    slot: 'site',
    sourceMessageIds: ['p1'],
    quotes: ['left lower back'],
    verified: true,
    ...overrides,
  };
}

describe('summary quote validator', () => {
  it('verifies patient quotes after normalising case and whitespace', () => {
    const result = verifyLine(
      line({ quotes: ['LEFT   LOWER BACK'], verified: false }),
      session().messages,
    );
    expect(result.verified).toBe(true);
  });

  it('rejects unknown IDs, assistant IDs, empty quotes, and unsupported quotes', () => {
    const messages = session().messages;
    for (const bad of [
      line({ sourceMessageIds: ['missing'] }),
      line({ sourceMessageIds: ['a1'], quotes: ['When did it start?'] }),
      line({ sourceMessageIds: ['p1', 'a1'] }),
      line({ sourceMessageIds: [] }),
      line({ quotes: [] }),
      line({ quotes: ['   '] }),
      line({ quotes: ['severe pain'] }),
    ]) {
      expect(verifyLine(bad, messages).verified).toBe(false);
    }
  });

  it('requires every source ID and every quote to be supported', () => {
    const messages = session().messages;
    expect(
      verifyLine(
        line({
          sourceMessageIds: ['p1', 'p2'],
          quotes: ['sitting', 'yesterday'],
        }),
        messages,
      ).verified,
    ).toBe(true);
    expect(
      verifyLine(
        line({
          sourceMessageIds: ['p1', 'p2'],
          quotes: ['sitting'],
        }),
        messages,
      ).verified,
    ).toBe(false);
    expect(
      verifyLine(
        line({
          sourceMessageIds: ['p1'],
          quotes: ['sitting', 'yesterday'],
        }),
        messages,
      ).verified,
    ).toBe(false);
  });

  it('accepts a quote from the translated text field when present', () => {
    const messages = session().messages.map((message) =>
      message.id === 'p1'
        ? { ...message, textEn: 'Pain in left lower back' }
        : message,
    );
    expect(
      verifyLine(line({ quotes: ['Pain in left lower back'] }), messages)
        .verified,
    ).toBe(true);
  });
});

describe('clinician summary generator', () => {
  it('validates every line and computes coverage and headline in code', async () => {
    const provider: LlmProvider = {
      completeJson: async (_prompt, schema) =>
        schema.parse({
          lines: [
            {
              text: 'Left lower back pain',
              slot: 'site',
              sourceMessageIds: ['p1'],
              quotes: ['left lower back'],
            },
            {
              text: 'Onset yesterday',
              slot: 'onset',
              sourceMessageIds: ['p2'],
              quotes: ['yesterday'],
            },
            {
              text: 'Severe, 9/10',
              slot: 'severity',
              sourceMessageIds: ['p1'],
              quotes: ['9/10'],
            },
            {
              text: 'Worse sitting since yesterday',
              slot: 'exacerbating',
              sourceMessageIds: ['p1', 'p2'],
              quotes: ['sitting', 'yesterday'],
            },
          ],
          clarify: ['Confirm whether the pain spreads.'],
          headline: ['Untrusted model headline'],
          notAsked: [],
        }),
    };
    const result = await generateSummary(
      provider,
      session(),
      () => '2026-01-01T09:03:00Z',
    );
    expect(result.lines.map((item) => item.verified)).toEqual([
      true,
      true,
      false,
      true,
    ]);
    expect(result.headline).toEqual([
      'Left lower back pain',
      'Onset yesterday',
      'Worse sitting since yesterday',
    ]);
    expect(result.notAsked).toContain('severity');
    expect(result.notAsked).not.toContain('radiation');
    expect(result.unsure).toEqual(['radiation']);
    expect(result.clarify).toEqual(['Confirm whether the pain spreads.']);
    expect(result.aiLabel).toBe(
      'AI-drafted from patient answers. Verify before use.',
    );
  });

  it('uses only patient messages in the prompt', () => {
    const prompt = summarisePrompt(session());
    expect(prompt).toContain('"id":"p1"');
    expect(prompt).not.toContain('"id":"a1"');
    expect(prompt).toContain('No diagnoses');
  });

  it('falls back to quote-backed facts when the provider fails', async () => {
    const provider: LlmProvider = {
      completeJson: async () => {
        throw new Error('provider offline');
      },
    };
    const result = await generateSummary(provider, session());
    expect(result.lines).toHaveLength(4);
    expect(result.lines.every((item) => item.verified)).toBe(true);
    expect(result.headline).toHaveLength(3);
  });

  it('never verifies a model line lacking matching patient words', async () => {
    const provider: LlmProvider = {
      completeJson: async (_prompt, schema) =>
        schema.parse({
          lines: ['9/10', 'fever', 'chest pain', 'weakness', 'numbness'].map(
            (quote) => ({
              text: `Patient reported ${quote}`,
              slot: 'associated',
              sourceMessageIds: ['p1'],
              quotes: [quote],
            }),
          ),
          clarify: [],
        }),
    };
    const result = await generateSummary(provider, session());
    expect(result.lines.every((item) => !item.verified)).toBe(true);
    expect(result.headline).toEqual([]);
  });
});
