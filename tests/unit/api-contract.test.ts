import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '@/contracts/api';
import {
  ConfirmResponseSchema,
  CreateSessionResponseSchema,
  GetClinicQueueResponseSchema,
  GetRecapResponseSchema,
  GetSessionResponseSchema,
  GetSummaryResponseSchema,
  PostFeedbackResponseSchema,
  PostMessageResponseSchema,
  PutMarksResponseSchema,
} from '@/contracts/api';
import { createMockApi } from '@/mocks/mock-api';
import { createServerApi } from '@/server/api/service';
import type { LlmProvider } from '@/server/llm/provider';
import { MemoryStore } from '@/server/store/memory';
import { GET as getQueue } from '@/app/api/clinic/queue/route';
import { POST as createSession } from '@/app/api/sessions/route';
import { GET as getSession } from '@/app/api/sessions/[id]/route';
import { PUT as putMarks } from '@/app/api/sessions/[id]/marks/route';
import { POST as postMessage } from '@/app/api/sessions/[id]/messages/route';
import { GET as getRecap } from '@/app/api/sessions/[id]/recap/route';
import { POST as confirm } from '@/app/api/sessions/[id]/confirm/route';
import { GET as getSummary } from '@/app/api/sessions/[id]/summary/route';
import { POST as postFeedback } from '@/app/api/sessions/[id]/feedback/route';

const appointment = {
  patientDisplayName: 'Synthetic Patient',
  clinician: 'Dr Example',
  startsAt: '2026-09-26T12:00:00.000Z',
};
const mark = {
  id: 'mark-1',
  regionId: 'lower_back_left',
  point: [0, 0, 0] as [number, number, number],
  kind: 'pain' as const,
  createdAt: appointment.startsAt,
};

async function exercise(api: ApiClient) {
  const created = CreateSessionResponseSchema.parse(
    await api.createSession({ appointment, lang: 'en', carerMode: false }),
  );
  const id = created.session.id;
  const session = GetSessionResponseSchema.parse(await api.getSession(id));
  const marks = PutMarksResponseSchema.parse(
    await api.putMarks(id, { marks: [mark] }),
  );
  const message = PostMessageResponseSchema.parse(
    await api.postMessage(id, { text: 'My lower back aches.' }),
  );
  const recap = GetRecapResponseSchema.parse(await api.getRecap(id));
  const summary = GetSummaryResponseSchema.parse(await api.getSummary(id));
  const queue = GetClinicQueueResponseSchema.parse(await api.getClinicQueue());
  return { created, session, marks, message, recap, summary, queue };
}

describe('mock and real API contracts', () => {
  it('returns the same response fields for the shared flow', async () => {
    const mock = await exercise(createMockApi({ delayMs: 0 }));
    const real = await exercise(createServerApi(new MemoryStore()));
    for (const key of Object.keys(mock) as (keyof typeof mock)[]) {
      expect(Object.keys(real[key]).sort()).toEqual(
        Object.keys(mock[key]).sort(),
      );
    }
    expect(Object.keys(real.created.session).sort()).toEqual(
      Object.keys(mock.created.session).sort(),
    );
    expect(Object.keys(real.message.turn).sort()).toEqual(
      Object.keys(mock.message.turn).sort(),
    );
    expect(real.message.turn.type).toBe('question');
    if (real.message.turn.type === 'question') {
      expect(real.message.turn.question.id).toBe('Q_MARKED_BACK_MOVE');
      expect(real.message.turn.message.text).toContain('Left lower back');
    }
  });

  it('supports recap edits, confirmation, feedback, and the safety stop', async () => {
    const api = createServerApi(new MemoryStore());
    const { session } = await api.createSession({
      appointment,
      lang: 'en',
      carerMode: false,
    });
    let turn = (
      await api.postMessage(session.id, { text: 'My lower back aches.' })
    ).turn;
    while (turn.type === 'question') {
      const answer =
        turn.question.slot === 'redflag'
          ? {
              text: '',
              choiceId: turn.question.id === 'RF_FEVER_TRAUMA' ? 'none' : 'no',
            }
          : { text: 'A few days ago.' };
      turn = (await api.postMessage(session.id, answer)).turn;
    }
    expect(turn.type).toBe('done');
    const recap = await api.getRecap(session.id);
    expect(recap.lines.length).toBeGreaterThan(0);
    const edit = {
      slot: recap.lines[0]!.slot,
      text: 'You said: My lower back aches.',
    };
    expect(
      ConfirmResponseSchema.parse(
        await api.confirm(session.id, { edits: [edit] }),
      ),
    ).toEqual({ ok: true });
    expect((await api.getRecap(session.id)).lines[0]?.text).toBe(edit.text);
    expect((await api.getSession(session.id)).session.status).toBe('confirmed');
    const { summary } = await api.getSummary(session.id);
    expect(summary.lines.length).toBeGreaterThan(0);
    expect(
      PostFeedbackResponseSchema.parse(
        await api.postFeedback(session.id, {
          lineIndex: 0,
          note: 'Synthetic feedback',
        }),
      ),
    ).toEqual({ ok: true });
    await expect(
      api.postFeedback(session.id, { lineIndex: 999, note: 'Bad index' }),
    ).rejects.toThrow();

    const flagged = await api.createSession({
      appointment,
      lang: 'en',
      carerMode: false,
    });
    const stopped = await api.postMessage(flagged.session.id, {
      text: 'I feel numb around my bum.',
    });
    expect(stopped.turn.type).toBe('redflag_stop');
    expect((await api.getClinicQueue()).items[0]?.sessionId).toBe(
      flagged.session.id,
    );
  });

  it('uses the configured provider for extraction and screens red flags first', async () => {
    const completeJson = vi.fn(async (prompt: string) => {
      if (prompt.includes('PATIENT_MESSAGE:')) {
        return {
          facts: [
            {
              slot: 'site',
              value: 'lower back',
              status: 'answered',
              quote: 'lower back',
            },
          ],
        } as never;
      }
      return { questionId: 'Q_ONSET', reason: '' } as never;
    });
    const provider: LlmProvider = { completeJson };
    const api = createServerApi(new MemoryStore(), provider);
    const normal = await api.createSession({
      appointment,
      lang: 'en',
      carerMode: false,
    });
    const answer = await api.postMessage(normal.session.id, {
      text: 'My lower back aches.',
    });
    expect(answer.session.facts[0]?.quote).toBe('lower back');
    expect(completeJson).toHaveBeenCalled();

    completeJson.mockClear();
    const flagged = await api.createSession({
      appointment,
      lang: 'en',
      carerMode: false,
    });
    const stopped = await api.postMessage(flagged.session.id, {
      text: 'I feel numb around my bum.',
    });
    expect(stopped.turn.type).toBe('redflag_stop');
    expect(completeJson).not.toHaveBeenCalled();
  });

  it('shows a recap for a completed older session with no extracted facts', async () => {
    const store = new MemoryStore();
    const api = createServerApi(store);
    const created = await api.createSession({
      appointment,
      lang: 'en',
      carerMode: false,
    });
    await store.update({
      ...created.session,
      status: 'awaiting_confirm',
      messages: [
        ...created.session.messages,
        {
          id: 'old-answer',
          role: 'patient',
          text: 'My left knee aches.',
          createdAt: appointment.startsAt,
        },
      ],
    });
    const recap = await api.getRecap(created.session.id);
    expect(recap.lines[0]?.text).toContain('My left knee aches.');
    expect(await api.confirm(created.session.id, { edits: [] })).toEqual({
      ok: true,
    });
    const { summary } = await api.getSummary(created.session.id);
    expect(summary.lines[0]?.quotes).toEqual(['My left knee aches.']);
    expect(summary.lines[0]?.verified).toBe(true);
  });
});

describe('HTTP route validation', () => {
  const request = (method: string, value: unknown) =>
    new Request('http://localhost/api/test', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    });
  const context = (id: string) => ({ params: Promise.resolve({ id }) });

  it('serves every endpoint with schema-valid JSON', async () => {
    const createdResponse = await createSession(
      request('POST', { appointment, lang: 'en', carerMode: false }),
    );
    expect(createdResponse.status).toBe(200);
    const created = CreateSessionResponseSchema.parse(
      await createdResponse.json(),
    );
    const id = created.session.id;
    GetSessionResponseSchema.parse(
      await (
        await getSession(new Request('http://localhost'), context(id))
      ).json(),
    );
    PutMarksResponseSchema.parse(
      await (
        await putMarks(request('PUT', { marks: [mark] }), context(id))
      ).json(),
    );
    PostMessageResponseSchema.parse(
      await (
        await postMessage(
          request('POST', { text: 'My lower back aches.' }),
          context(id),
        )
      ).json(),
    );
    GetRecapResponseSchema.parse(
      await (
        await getRecap(new Request('http://localhost'), context(id))
      ).json(),
    );
    GetSummaryResponseSchema.parse(
      await (
        await getSummary(new Request('http://localhost'), context(id))
      ).json(),
    );
    GetClinicQueueResponseSchema.parse(await (await getQueue()).json());

    const session = await getSession(
      new Request('http://localhost'),
      context(id),
    );
    let current = GetSessionResponseSchema.parse(await session.json()).session;
    while (current.status === 'in_progress') {
      const last = current.messages.at(-1);
      const answer = last?.questionId?.startsWith('RF_')
        ? {
            text: '',
            choiceId: last.questionId === 'RF_FEVER_TRAUMA' ? 'none' : 'no',
          }
        : { text: 'A few days ago.' };
      const response = await postMessage(request('POST', answer), context(id));
      expect(response.status).toBe(200);
      current = PostMessageResponseSchema.parse(await response.json()).session;
    }
    ConfirmResponseSchema.parse(
      await (await confirm(request('POST', { edits: [] }), context(id))).json(),
    );
    PostFeedbackResponseSchema.parse(
      await (
        await postFeedback(
          request('POST', { lineIndex: 0, note: 'Synthetic note' }),
          context(id),
        )
      ).json(),
    );
  });

  it('returns clear 400s for bad input and 404 for missing sessions', async () => {
    const invalid = await createSession(
      request('POST', { appointment, lang: 'unknown', carerMode: false }),
    );
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).message).toMatch(/Invalid input/u);
    const malformed = await createSession(
      new Request('http://localhost/api/sessions', {
        method: 'POST',
        body: '{',
      }),
    );
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).message).toMatch(/JSON/u);
    const missing = await getSession(
      new Request('http://localhost'),
      context('absent'),
    );
    expect(missing.status).toBe(404);
    const badMarks = await putMarks(
      request('PUT', { marks: [{ ...mark, intensity: 50 }] }),
      context('absent'),
    );
    expect(badMarks.status).toBe(400);
  });
});
