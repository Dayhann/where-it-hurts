import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { Message, Question, Session } from '@/contracts/types';
import { questionBank } from '@/server/questions/bank';
import { extractFacts } from '@/server/llm/extract';
import { GeminiProvider, type LlmProvider } from '@/server/llm/provider';

const message: Message = {
  id: 'synthetic-message',
  role: 'patient',
  text: 'My left knee aches',
  createdAt: '2026-01-01T10:00:00Z',
};
const question = questionBank.find((item) => item.id === 'Q_OPEN') as Question;
const session: Session = {
  id: 'synthetic-session',
  appointment: {
    patientDisplayName: 'Demo patient',
    clinician: 'Demo clinician',
    startsAt: '2026-01-01T10:00:00Z',
  },
  lang: 'en',
  carerMode: false,
  status: 'in_progress',
  marks: [],
  messages: [],
  facts: [],
  askedQuestionIds: [],
  redFlags: [],
  createdAt: '2026-01-01T09:00:00Z',
};

describe('Gemini JSON provider', () => {
  it('sends deterministic JSON config and validates the result', async () => {
    const generate = vi.fn().mockResolvedValue({ text: '{"answer":42}' });
    const provider = new GeminiProvider('synthetic-model', '', generate);
    const result = await provider.completeJson(
      'Synthetic prompt',
      z.object({ answer: z.number() }),
    );
    expect(result).toEqual({ answer: 42 });
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'synthetic-model',
        contents: 'Synthetic prompt',
        config: expect.objectContaining({
          temperature: 0,
          responseMimeType: 'application/json',
          abortSignal: expect.any(AbortSignal),
        }),
      }),
    );
  });

  it('retries once after invalid JSON and rejects invalid schema output', async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce({ text: 'not json' })
      .mockResolvedValueOnce({ text: '{"answer":"yes"}' });
    const provider = new GeminiProvider('synthetic-model', '', generate);
    await expect(
      provider.completeJson(
        'Synthetic prompt',
        z.object({ answer: z.number() }),
      ),
    ).rejects.toThrow('failed after one retry');
    expect(generate).toHaveBeenCalledTimes(2);
  });
});

describe('fact extraction', () => {
  it('keeps only quoted patient facts and adds the source ID', async () => {
    const provider: LlmProvider = {
      completeJson: async () =>
        ({
          facts: [
            {
              slot: 'site',
              value: 'left knee',
              status: 'answered',
              quote: 'left knee',
            },
            {
              slot: 'severity',
              value: '9/10',
              status: 'answered',
              quote: 'nine out of ten',
            },
          ],
        }) as never,
    };
    const facts = await extractFacts(provider, message, session, question);
    expect(facts).toEqual([
      {
        slot: 'site',
        value: 'left knee',
        status: 'answered',
        quote: 'left knee',
        sourceMessageIds: ['synthetic-message'],
      },
    ]);
  });

  it('returns no facts when the provider fails', async () => {
    const provider: LlmProvider = {
      completeJson: async () => {
        throw new Error('offline');
      },
    };
    expect(await extractFacts(provider, message, session, question)).toEqual(
      [],
    );
  });
});
