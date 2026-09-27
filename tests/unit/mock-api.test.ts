import { describe, expect, it } from 'vitest';
import {
  GetClinicQueueResponseSchema,
  GetRecapResponseSchema,
  GetSummaryResponseSchema,
} from '@/contracts/api';
import { ClinicianSummarySchema, SessionSchema } from '@/contracts/schemas';
import { mockConfirmedSummary, mockSessions } from '@/mocks/fixtures';
import { createMockApi } from '@/mocks/mock-api';

const appointment = {
  patientDisplayName: 'Case Demo',
  clinician: 'Dr Example',
  startsAt: '2026-09-26T12:00:00.000Z',
};

describe('mock fixtures', () => {
  it('provides three synthetic states and a quote-backed confirmed summary', () => {
    expect(mockSessions.map((session) => session.status)).toEqual([
      'in_progress',
      'redflag_stopped',
      'confirmed',
    ]);
    mockSessions.forEach((session) => SessionSchema.parse(session));
    ClinicianSummarySchema.parse(mockConfirmedSummary);
    const confirmed = mockSessions.find(
      (session) => session.id === 'mock-confirmed',
    );
    expect(confirmed).toBeDefined();
    for (const line of mockConfirmedSummary.lines) {
      expect(line.verified).toBe(true);
      for (const quote of line.quotes) {
        expect(
          confirmed?.messages.some(
            (message) =>
              message.role === 'patient' &&
              line.sourceMessageIds.includes(message.id) &&
              message.text.includes(quote),
          ),
        ).toBe(true);
      }
    }
  });
});

describe('mock API', () => {
  it('runs a complete session through marks, questions, recap, confirmation, and summary', async () => {
    const api = createMockApi({ delayMs: 0 });
    const created = await api.createSession({
      appointment,
      lang: 'en',
      carerMode: false,
    });
    expect(created.firstTurn.type).toBe('question');
    expect(created.session.messages).toHaveLength(1);
    const id = created.session.id;

    await api.putMarks(id, {
      marks: [
        {
          id: 'case-mark',
          regionId: 'lower_back_left',
          point: [0, 0, 0],
          kind: 'pain',
          createdAt: appointment.startsAt,
        },
      ],
      snapshots: { front: 'data:image/png;base64,AAAA' },
    });
    expect((await api.getSession(id)).session.marks).toHaveLength(1);

    let turn = created.firstTurn;
    let lastSession = created.session;
    while (turn.type === 'question') {
      const body =
        turn.question.slot === 'redflag'
          ? {
              text: '',
              choiceId: turn.question.id === 'RF_FEVER_TRAUMA' ? 'none' : 'no',
            }
          : {
              text:
                turn.question.id === 'Q_OPEN'
                  ? 'My back aches.'
                  : 'A few days ago.',
            };
      const result = await api.postMessage(id, body);
      lastSession = result.session;
      turn = result.turn;
    }
    expect(turn.type).toBe('done');
    expect(lastSession.status).toBe('awaiting_confirm');
    expect(lastSession.askedQuestionIds).toHaveLength(8);
    expect(lastSession.redFlags).toEqual([]);

    const recap = GetRecapResponseSchema.parse(await api.getRecap(id));
    expect(recap.lines.length).toBeGreaterThan(0);
    expect(recap.lines[0]?.text).toContain('My back aches.');
    expect(
      await api.confirm(id, {
        edits: [{ slot: 'site', text: 'You said: My lower back aches.' }],
      }),
    ).toEqual({ ok: true });
    expect((await api.getSession(id)).session.status).toBe('confirmed');
    expect((await api.getRecap(id)).lines[0]?.text).toBe(
      'You said: My lower back aches.',
    );

    const { summary } = GetSummaryResponseSchema.parse(
      await api.getSummary(id),
    );
    expect(summary.lines.length).toBeGreaterThan(0);
    expect(summary.lines.every((line) => line.verified)).toBe(true);
    expect(summary.notAsked).toContain('radiation');
    expect(summary.unsure).toEqual([]);
    expect(
      await api.postFeedback(id, { lineIndex: 0, note: 'Demo feedback' }),
    ).toEqual({ ok: true });
  });

  it.each(['yes', 'not_sure'])(
    'stops after a mandatory %s answer and puts the flag first in queue',
    async (choiceId) => {
      const api = createMockApi({ delayMs: 0 });
      const { session } = await api.createSession({
        appointment,
        lang: 'en',
        carerMode: false,
      });
      let turn = (await api.postMessage(session.id, { text: 'My back aches.' }))
        .turn;
      while (turn.type === 'question' && !turn.question.mandatory) {
        turn = (await api.postMessage(session.id, { text: 'A few days ago.' }))
          .turn;
      }
      expect(turn.type).toBe('question');
      const result = await api.postMessage(session.id, { text: '', choiceId });
      expect(result.turn.type).toBe('redflag_stop');
      expect(result.session.status).toBe('redflag_stopped');
      expect(result.session.redFlags[0]?.sourceMessageId).toBe(
        result.session.messages.at(-1)?.id,
      );
      const queue = GetClinicQueueResponseSchema.parse(
        await api.getClinicQueue(),
      );
      expect(queue.items[0]?.sessionId).toBe('mock-red-flag');
      expect(queue.items[1]?.sessionId).toBe(session.id);
      await expect(
        api.postMessage(session.id, { text: 'Another answer' }),
      ).rejects.toThrow();
    },
  );

  it('stops on a specific systemic or injury choice from the combined red-flag question', async () => {
    const api = createMockApi({ delayMs: 0 });
    const { session, firstTurn } = await api.createSession({
      appointment,
      lang: 'en',
      carerMode: false,
    });
    let turn = firstTurn;
    while (turn.type === 'question' && turn.question.id !== 'RF_FEVER_TRAUMA') {
      const result = await api.postMessage(session.id, {
        text: '',
        ...(turn.question.slot === 'redflag'
          ? { choiceId: 'no' }
          : { text: 'A few days ago.' }),
      });
      turn = result.turn;
    }
    expect(turn.type).toBe('question');
    const result = await api.postMessage(session.id, {
      text: '',
      choiceId: 'fever',
    });
    expect(result.turn.type).toBe('redflag_stop');
    expect(result.session.status).toBe('redflag_stopped');
  });

  it('returns independent copies and rejects invalid input', async () => {
    const api = createMockApi({ delayMs: 0 });
    const first = (await api.getSession('mock-in-progress')).session;
    first.messages[0]!.text = 'changed outside the mock';
    const second = (await api.getSession('mock-in-progress')).session;
    expect(second.messages[0]?.text).not.toBe(first.messages[0]?.text);
    await expect(
      api.createSession({
        appointment: { ...appointment, clinician: '' },
        lang: 'en',
        carerMode: false,
      }),
    ).rejects.toThrow();
    await expect(api.getSession('missing')).rejects.toThrow();
    await expect(
      api.postFeedback('mock-confirmed', {
        lineIndex: 100,
        note: 'outside summary',
      }),
    ).rejects.toThrow();
  });

  it('stops on a direct chest-pain report but not a denial', async () => {
    const api = createMockApi({ delayMs: 0 });
    const denied = await api.createSession({
      appointment,
      lang: 'en',
      carerMode: false,
    });
    expect(
      (await api.postMessage(denied.session.id, { text: 'No chest pain.' }))
        .turn.type,
    ).toBe('question');
    const reported = await api.createSession({
      appointment,
      lang: 'en',
      carerMode: false,
    });
    expect(
      (
        await api.postMessage(reported.session.id, {
          text: 'I have chest pain.',
        })
      ).turn.type,
    ).toBe('redflag_stop');
  });

  it('supports the planned numb-around-my-bum demo stop', async () => {
    const api = createMockApi({ delayMs: 0 });
    const { session } = await api.createSession({
      appointment,
      lang: 'en',
      carerMode: false,
    });
    const result = await api.postMessage(session.id, {
      text: 'I feel numb around my bum.',
    });
    expect(result.turn.type).toBe('redflag_stop');
    expect(result.session.redFlags[0]?.ruleId).toBe('RF_CAUDA_SADDLE');
  });
});
