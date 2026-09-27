import { describe, expect, it, vi } from 'vitest';
import type { Question, Session } from '@/contracts/types';
import {
  startConversation,
  handlePatientMessage,
} from '@/server/engine/conversation';
import { llmEngineDependencies } from '@/server/engine/llm-deps';
import type { LlmProvider } from '@/server/llm/provider';
import { selectQuestionId } from '@/server/llm/select';
import { questionBank } from '@/server/questions/bank';

function session(regionId?: string): Session {
  return {
    id: 'synthetic-selection-session',
    appointment: {
      patientDisplayName: 'Demo patient',
      clinician: 'Demo clinician',
      startsAt: '2026-01-01T10:00:00Z',
    },
    lang: 'en',
    carerMode: false,
    status: 'in_progress',
    marks: regionId
      ? [
          {
            id: 'mark-1',
            regionId,
            point: [0, 0, 0],
            kind: 'pain',
            createdAt: '2026-01-01T09:00:00Z',
          },
        ]
      : [],
    messages: [],
    facts: [],
    askedQuestionIds: [],
    redFlags: [],
    createdAt: '2026-01-01T09:00:00Z',
  };
}

function question(id: string): Question {
  const found = questionBank.find((item) => item.id === id);
  if (!found) throw new Error(`Missing test question: ${id}`);
  return found;
}

describe('LLM question selection', () => {
  const candidates = [question('Q_ONSET'), question('Q_CHAR')];

  it('returns a valid offered ID and includes marked areas in the prompt', async () => {
    const completeJson = vi.fn(async (prompt: string) => {
      expect(prompt).toContain('"id":"Q_ONSET"');
      expect(prompt).toContain('"id":"Q_CHAR"');
      expect(prompt).toContain('REGION_GROUPS: ["knee"]');
      expect(prompt).toContain('"label":"Left knee"');
      expect(prompt).toContain('"kind":"pain"');
      expect(prompt).not.toContain('RF_SADDLE');
    });
    const provider: LlmProvider = {
      completeJson: async (prompt, schema) => {
        await completeJson(prompt);
        return schema.parse({
          questionId: 'Q_CHAR',
          reason: 'Clarify how it feels',
        });
      },
    };
    expect(
      await selectQuestionId(provider, candidates, session('knee_left')),
    ).toBe('Q_CHAR');
    expect(completeJson).toHaveBeenCalledTimes(1);
  });

  it('rejects an invented ID or malformed model response', async () => {
    const invented: LlmProvider = {
      completeJson: async (_prompt, schema) =>
        schema.parse({ questionId: 'Q_IMAGINARY', reason: 'More detail' }),
    };
    expect(
      await selectQuestionId(invented, candidates, session()),
    ).toBeUndefined();
    const malformed: LlmProvider = {
      completeJson: async (_prompt, schema) =>
        schema.parse({
          questionId: 'Q_CHAR',
          reason:
            'one two three four five six seven eight nine ten eleven twelve thirteen',
        }),
    };
    expect(
      await selectQuestionId(malformed, candidates, session()),
    ).toBeUndefined();
  });

  it('does not call the provider for no candidates and falls back on failure', async () => {
    const completeJson = vi.fn(async () => {
      throw new Error('provider unavailable');
    });
    const provider: LlmProvider = { completeJson };
    expect(await selectQuestionId(provider, [], session())).toBeUndefined();
    expect(completeJson).not.toHaveBeenCalled();
    expect(
      await selectQuestionId(provider, candidates, session()),
    ).toBeUndefined();
  });

  it('wires extraction then selects a bank question after the safety check', async () => {
    const calls: string[] = [];
    const provider: LlmProvider = {
      completeJson: async (prompt, schema) => {
        if (prompt.includes('PATIENT_MESSAGE:')) {
          calls.push('extract');
          return schema.parse({
            facts: [
              {
                slot: 'site',
                value: 'left knee',
                status: 'answered',
                quote: 'left knee',
              },
            ],
          });
        }
        calls.push('select');
        return schema.parse({
          questionId: 'Q_MARKED_KNEE_MOVE',
          reason: 'Ask about selected area',
        });
      },
    };
    const started = startConversation(session('knee_left'));
    const result = await handlePatientMessage(
      started.session,
      {
        text: 'Pain in my left knee',
      },
      llmEngineDependencies(provider),
    );
    expect(calls).toEqual(['extract', 'select']);
    expect(result.turn.type).toBe('question');
    if (result.turn.type === 'question')
      expect(result.turn.question.id).toBe('Q_MARKED_KNEE_MOVE');
    if (result.turn.type === 'question')
      expect(result.turn.message.text).toContain('Left knee');
    expect(result.session.facts[0]?.sourceMessageIds).toEqual([
      result.session.messages[1]?.id,
    ]);
  });

  it.each([
    ['neck', 'Q_MARKED_NECK_MOVE', 'Neck'],
    ['chest_left', 'Q_MARKED_CHEST_MOVE', 'Left chest'],
    ['abdomen_left', 'Q_MARKED_ABDOMEN_MOVE', 'Left abdomen'],
    ['lower_back_left', 'Q_MARKED_BACK_MOVE', 'Left lower back'],
    ['shoulder_left', 'Q_MARKED_SHOULDER_MOVE', 'Left shoulder'],
    ['elbow_left', 'Q_MARKED_ELBOW_MOVE', 'Left elbow'],
    ['wrist_hand_left', 'Q_MARKED_WRIST_MOVE', 'Left wrist and hand'],
    ['hip_left', 'Q_MARKED_HIP_MOVE', 'Left hip'],
    ['knee_left', 'Q_MARKED_KNEE_MOVE', 'Left knee'],
    ['ankle_foot_left', 'Q_MARKED_ANKLE_MOVE', 'Left ankle and foot'],
  ])(
    'asks a %s-specific bank question after a mark',
    async (regionId, expectedId, label) => {
      const started = startConversation(session(regionId));
      const result = await handlePatientMessage(started.session, {
        text: 'It feels sore.',
      });
      expect(result.turn.type).toBe('question');
      if (result.turn.type === 'question') {
        expect(result.turn.question.id).toBe(expectedId);
        expect(result.turn.message.text).toContain(label);
        expect(result.turn.message.text).not.toContain('{marked_areas}');
      }
    },
  );

  it('names only the relevant area when several groups are marked', async () => {
    const original = session('knee_left');
    original.marks.push({
      ...original.marks[0]!,
      id: 'mark-2',
      regionId: 'shoulder_right',
    });
    const started = startConversation(original);
    const result = await handlePatientMessage(started.session, {
      text: 'It feels sore.',
    });
    expect(result.turn.type).toBe('question');
    if (result.turn.type === 'question') {
      expect(result.turn.question.id).toBe('Q_MARKED_KNEE_MOVE');
      expect(result.turn.message.text).toContain('Left knee');
      expect(result.turn.message.text).not.toContain('Right shoulder');
    }
  });

  it('offers a knee symptom question after movement is already described', async () => {
    const started = startConversation(session('knee_left'));
    let offered: string[] = [];
    const result = await handlePatientMessage(
      started.session,
      { text: 'My left knee hurts when I walk.' },
      {
        extract: async (message) =>
          (['site', 'exacerbating'] as const).map((slot) => ({
            slot,
            value: message.text,
            status: 'answered' as const,
            sourceMessageIds: [message.id],
            quote: message.text,
          })),
        select: async (questions) => {
          offered = questions.map((item) => item.id);
          return 'Q_REGION_KNEE_ASSOC';
        },
      },
    );
    expect(offered).toContain('Q_REGION_KNEE_ASSOC');
    expect(offered).not.toContain('Q_REGION_HIP_ASSOC');
    expect(result.turn.type).toBe('question');
    if (result.turn.type === 'question')
      expect(result.turn.question.id).toBe('Q_REGION_KNEE_ASSOC');
  });

  it('stops on a red flag without calling either LLM step', async () => {
    const completeJson = vi.fn(async () => {
      throw new Error('must not be called');
    });
    const provider: LlmProvider = { completeJson };
    const started = startConversation(session('lower_back_left'));
    const result = await handlePatientMessage(
      started.session,
      {
        text: 'New numbness in my groin',
      },
      llmEngineDependencies(provider),
    );
    expect(result.turn.type).toBe('redflag_stop');
    expect(completeJson).not.toHaveBeenCalled();
  });

  it('excludes already covered slots and region-specific questions without a mark', async () => {
    let offered = '';
    const started = startConversation(session());
    const result = await handlePatientMessage(
      started.session,
      {
        text: 'Pain started in my left knee yesterday',
      },
      {
        extract: async (message) => [
          {
            slot: 'site',
            value: 'left knee',
            status: 'answered',
            sourceMessageIds: [message.id],
            quote: 'left knee',
          },
          {
            slot: 'onset',
            value: 'yesterday',
            status: 'answered',
            sourceMessageIds: [message.id],
            quote: 'yesterday',
          },
        ],
        select: async (questions) => {
          offered = questions.map((item) => item.id).join(',');
          return 'Q_ONSET'; // rejected because onset is already covered
        },
      },
    );
    expect(offered).not.toContain('Q_ONSET');
    expect(offered).not.toContain('Q_SITE_DETAIL');
    expect(offered).not.toContain('Q_EXAC_SIT_STAND');
    expect(offered).not.toContain('Q_MARKED_');
    if (result.turn.type === 'question')
      expect(result.turn.question.id).toBe('Q_CHAR');
  });

  it('treats an explicit denial as a covered slot', async () => {
    const started = startConversation(session('knee_left'));
    let offered: string[] = [];
    await handlePatientMessage(
      started.session,
      { text: 'No pain spread' },
      {
        extract: async (message) => [
          {
            slot: 'radiation',
            value: 'no spread',
            status: 'denied',
            sourceMessageIds: [message.id],
            quote: 'No pain spread',
          },
        ],
        select: async (questions) => {
          offered = questions.map((item) => item.id);
          return undefined;
        },
      },
    );
    expect(offered).not.toContain('Q_RAD');
  });
});
