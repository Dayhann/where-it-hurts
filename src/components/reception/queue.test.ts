import { describe, expect, it } from 'vitest';
import type { QueueItem } from './queue';
import { queueStatus, sortReceptionQueue } from './queue';

const item = (
  sessionId: string,
  startsAt: string,
  redFlag = false,
): QueueItem => ({
  sessionId,
  patientDisplayName: `${sessionId} Demo`,
  startsAt,
  status: redFlag ? 'redflag_stopped' : 'confirmed',
  redFlag,
});

describe('sortReceptionQueue', () => {
  it('pins red flags first, then sorts by appointment time', () => {
    const sorted = sortReceptionQueue([
      item('later', '2026-09-26T11:00:00.000Z'),
      item('alert', '2026-09-26T12:00:00.000Z', true),
      item('earlier', '2026-09-26T10:00:00.000Z'),
    ]);

    expect(sorted.map(({ sessionId }) => sessionId)).toEqual([
      'alert',
      'earlier',
      'later',
    ]);
  });
});

describe('queueStatus', () => {
  it('uses distinct copy for each check-in state', () => {
    expect(queueStatus('in_progress')).toBe('In progress');
    expect(queueStatus('awaiting_confirm')).toBe('Reviewing answers');
    expect(queueStatus('confirmed')).toBe('Ready');
  });
});
