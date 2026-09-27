import { describe, expect, it, vi } from 'vitest';
import type { Session, SlotFact } from '@/contracts/types';
import {
  handlePatientMessage,
  startConversation,
} from '@/server/engine/conversation';

function session(regionId?: string): Session {
  return {
    id: 'synthetic-engine-session',
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

describe('conversation engine', () => {
  it('starts with the bank open question and does not mutate the input', () => {
    const original = session();
    const result = startConversation(original);
    expect(result.turn.type).toBe('question');
    if (result.turn.type === 'question')
      expect(result.turn.question.id).toBe('Q_OPEN');
    expect(original.messages).toEqual([]);
    expect(result.session.askedQuestionIds).toEqual(['Q_OPEN']);
  });

  it('screens before extraction and stops on free-text red flags', async () => {
    const extract = vi.fn().mockResolvedValue([]);
    const started = startConversation(session('lower_back_left'));
    const result = await handlePatientMessage(
      started.session,
      {
        text: 'I have new numbness around my groin',
      },
      { extract },
    );
    expect(result.turn.type).toBe('redflag_stop');
    expect(result.session.status).toBe('redflag_stopped');
    expect(result.session.redFlags[0]?.sourceMessageId).toBe(
      result.session.messages.at(-1)?.id,
    );
    expect(extract).not.toHaveBeenCalled();
  });

  it('asks all applicable mandatory questions before finishing at eight', async () => {
    let current = startConversation(session('lower_back_left')).session;
    let turn;
    for (let i = 0; i < 8; i++) {
      const questionId = current.askedQuestionIds.at(-1);
      const input = questionId?.startsWith('RF_')
        ? {
            text: '',
            choiceId: questionId === 'RF_FEVER_TRAUMA' ? 'none' : 'no',
          }
        : { text: `Synthetic answer ${i}` };
      ({ session: current, turn } = await handlePatientMessage(current, input));
    }
    expect(turn?.type).toBe('done');
    expect(current.status).toBe('awaiting_confirm');
    expect(current.askedQuestionIds).toHaveLength(8);
    expect(current.askedQuestionIds).toEqual(
      expect.arrayContaining([
        'RF_SADDLE',
        'RF_BLADDER',
        'RF_BILAT_WEAK',
        'RF_FEVER_TRAUMA',
      ]),
    );
  });

  it('stops on an uncertain mandatory answer', async () => {
    let current = startConversation(session('lower_back_left')).session;
    for (let i = 0; i < 2; i++) {
      current = (
        await handlePatientMessage(current, { text: `Synthetic issue ${i}` })
      ).session;
    }
    expect(current.askedQuestionIds.at(-1)).toBe('RF_SADDLE');
    const result = await handlePatientMessage(current, {
      text: '',
      choiceId: 'not_sure',
    });
    expect(result.turn.type).toBe('redflag_stop');
  });

  it('uses the selector only for offered candidates and falls back on failure', async () => {
    const started = startConversation(session('knee_left'));
    const invalid = await handlePatientMessage(
      started.session,
      {
        text: 'My knee feels sore',
      },
      { select: async () => 'INVENTED_QUESTION' },
    );
    expect(invalid.turn.type).toBe('question');
    if (invalid.turn.type === 'question')
      expect(invalid.turn.question.id).toBe('Q_MARKED_KNEE_MOVE');
    const failed = await handlePatientMessage(
      started.session,
      {
        text: 'My knee feels sore',
      },
      {
        select: async () => {
          throw new Error('provider offline');
        },
      },
    );
    if (failed.turn.type === 'question')
      expect(failed.turn.question.id).toBe('Q_MARKED_KNEE_MOVE');
  });

  it('drops unsupported extracted quotes and accepts supported ones', async () => {
    const started = startConversation(session());
    const extract = async (message: { id: string }): Promise<SlotFact[]> => [
      {
        slot: 'site',
        value: 'shoulder',
        status: 'answered',
        sourceMessageIds: [message.id],
        quote: 'my shoulder',
      },
      {
        slot: 'severity',
        value: '9/10',
        status: 'answered',
        sourceMessageIds: [message.id],
        quote: 'nine out of ten',
      },
    ];
    const result = await handlePatientMessage(
      started.session,
      {
        text: 'Pain in my shoulder',
      },
      { extract },
    );
    expect(result.session.facts.map((fact) => fact.slot)).toEqual(['site']);
  });

  it('finishes early when required facts and mandatory questions are complete', async () => {
    let current = startConversation(session('knee_left')).session;
    const required = [
      'site',
      'onset',
      'character',
      'radiation',
      'exacerbating',
      'timing',
      'severity',
    ] as const;
    const extract = async (message: {
      id: string;
      text: string;
    }): Promise<SlotFact[]> =>
      required.map((slot) => ({
        slot,
        value: message.text,
        status: 'answered',
        sourceMessageIds: [message.id],
        quote: message.text,
      }));
    current = (
      await handlePatientMessage(
        current,
        { text: 'Synthetic knee issue' },
        { extract },
      )
    ).session;
    current = (
      await handlePatientMessage(current, { text: 'A few days' }, { extract })
    ).session;
    expect(current.askedQuestionIds.at(-1)).toBe('RF_FEVER_TRAUMA');
    const result = await handlePatientMessage(
      current,
      { text: '', choiceId: 'none' },
      { extract },
    );
    expect(result.turn.type).toBe('done');
    expect(result.session.askedQuestionIds).toHaveLength(3);
  });
});
