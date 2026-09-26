import { describe, expect, it } from 'vitest';
import { SessionSchema } from '@/contracts/schemas';
import type { Session } from '@/contracts/types';
import { MemoryStore } from '@/server/store/memory';

function session(id: string, startsAt = '2026-09-26T10:00:00.000Z'): Session {
  return SessionSchema.parse({
    id,
    appointment: {
      patientDisplayName: `${id} Demo`,
      clinician: 'Dr Example',
      startsAt,
    },
    lang: 'en',
    carerMode: false,
    status: 'in_progress',
    marks: [],
    messages: [],
    facts: [],
    askedQuestionIds: [],
    redFlags: [],
    createdAt: '2026-09-26T09:00:00.000Z',
  });
}

describe('MemoryStore', () => {
  it('creates, reads and updates a session without sharing mutable references', async () => {
    const store = new MemoryStore();
    const original = session('case-one');
    const created = await store.create(original);
    original.appointment.patientDisplayName = 'changed original';
    created.appointment.patientDisplayName = 'changed returned copy';

    const saved = await store.get('case-one');
    expect(saved?.appointment.patientDisplayName).toBe('case-one Demo');
    expect(await store.get('missing')).toBeNull();

    const updated = await store.update({
      ...saved!,
      status: 'awaiting_confirm',
      marks: [
        {
          id: 'mark-one',
          regionId: 'lower_back_left',
          point: [0, 0, 0],
          kind: 'pain',
          createdAt: saved!.createdAt,
        },
      ],
    });
    updated.marks.pop();
    expect((await store.get('case-one'))?.marks).toHaveLength(1);
    expect((await store.get('case-one'))?.status).toBe('awaiting_confirm');
  });

  it('rejects duplicate ids, missing updates and invalid sessions', async () => {
    const store = new MemoryStore();
    const valid = session('case-one');
    await store.create(valid);
    await expect(store.create(valid)).rejects.toThrow('already exists');
    await expect(store.update(session('missing'))).rejects.toThrow('not found');
    await expect(
      store.create({ ...valid, lang: 'fr' } as unknown as Session),
    ).rejects.toThrow();
  });

  it('lists red flags first, then appointment time, with status preserved', async () => {
    const store = new MemoryStore();
    await store.create(session('later', '2026-09-26T13:00:00.000Z'));
    await store.create(session('earlier', '2026-09-26T09:00:00.000Z'));
    await store.create({
      ...session('flagged', '2026-09-26T14:00:00.000Z'),
      status: 'redflag_stopped',
      messages: [
        {
          id: 'synthetic-message',
          role: 'patient',
          text: 'I have chest pain.',
          inputMode: 'text',
          createdAt: '2026-09-26T09:00:00.000Z',
        },
      ],
      redFlags: [
        {
          ruleId: 'RF_CHEST',
          label: 'Chest pain',
          sourceMessageId: 'synthetic-message',
        },
      ],
    });
    const queue = await store.listQueue();
    expect(queue.map((item) => item.sessionId)).toEqual([
      'flagged',
      'earlier',
      'later',
    ]);
    expect(queue[0]).toMatchObject({
      status: 'redflag_stopped',
      redFlag: true,
      patientDisplayName: 'flagged Demo',
    });
  });
});
