import { describe, expect, it } from 'vitest';
import type { Session } from '@/contracts/types';
import { chatHasStarted, turnFromSession } from './resume-turn';

const base: Session = {
  id: 'mock-in-progress',
  appointment: {
    patientDisplayName: 'Alex Demo',
    clinician: 'Dr Morgan Demo',
    startsAt: '2026-09-26T10:00:00.000Z',
  },
  lang: 'en',
  carerMode: false,
  status: 'in_progress',
  marks: [],
  messages: [
    {
      id: 'q1',
      role: 'assistant',
      questionId: 'Q_OPEN',
      text: "What's the issue?",
      createdAt: '2026-09-26T09:00:00.000Z',
    },
    {
      id: 'a1',
      role: 'patient',
      text: 'My left lower back has been aching.',
      createdAt: '2026-09-26T09:01:00.000Z',
    },
    {
      id: 'q2',
      role: 'assistant',
      questionId: 'Q_ONSET',
      text: 'When did it start?',
      createdAt: '2026-09-26T09:02:00.000Z',
    },
  ],
  facts: [],
  askedQuestionIds: ['Q_OPEN', 'Q_ONSET'],
  redFlags: [],
  createdAt: '2026-09-26T09:00:00.000Z',
};

describe('turnFromSession', () => {
  it('rebuilds the pending onset question so resume still has chips', () => {
    const turn = turnFromSession(base);
    expect(turn?.type).toBe('question');
    if (turn?.type !== 'question') return;
    expect(turn.progress).toEqual({ asked: 2, estimatedTotal: 8 });
    expect(turn.question.options?.map((option) => option.id)).toContain(
      'today',
    );
  });

  it('maps a stopped session to the red-flag turn', () => {
    const turn = turnFromSession({
      ...base,
      status: 'redflag_stopped',
      redFlags: [
        {
          ruleId: 'RF_CHEST',
          label: 'Chest pain',
          sourceMessageId: 'a1',
        },
      ],
    });
    expect(turn).toEqual({
      type: 'redflag_stop',
      hits: [
        {
          ruleId: 'RF_CHEST',
          label: 'Chest pain',
          sourceMessageId: 'a1',
        },
      ],
    });
  });
});

describe('chatHasStarted', () => {
  it('is true once the patient has sent a message', () => {
    expect(chatHasStarted(base)).toBe(true);
    expect(chatHasStarted({ ...base, messages: [base.messages[0]] })).toBe(
      false,
    );
  });
});
