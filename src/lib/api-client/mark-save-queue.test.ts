import { describe, expect, it, vi } from 'vitest';
import type { BodyMark } from '@/contracts/types';
import { MarkSaveQueue, type MarkSaveState } from './mark-save-queue';

const first: BodyMark[] = [
  {
    id: 'first',
    regionId: 'neck',
    point: [0, 1, 0],
    kind: 'pain',
    createdAt: '2026-09-26T09:00:00.000Z',
  },
];
const second: BodyMark[] = [
  {
    id: 'second',
    regionId: 'knee_left',
    point: [0, 0.4, 0],
    kind: 'pain',
    createdAt: '2026-09-26T09:01:00.000Z',
  },
];

function deferred() {
  let resolve!: () => void;
  let reject!: () => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('MarkSaveQueue', () => {
  it('waits for an older write before starting the newer write', async () => {
    const a = deferred();
    const b = deferred();
    const save = vi
      .fn<(marks: BodyMark[]) => Promise<void>>()
      .mockReturnValueOnce(a.promise)
      .mockReturnValueOnce(b.promise);
    const states: MarkSaveState[] = [];
    const queue = new MarkSaveQueue(save, (state) => states.push(state));

    queue.enqueue(first);
    queue.enqueue(second);
    await Promise.resolve();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenNthCalledWith(1, first);

    a.resolve();
    await a.promise;
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save).toHaveBeenNthCalledWith(2, second);

    b.resolve();
    await b.promise;
    await vi.waitFor(() => expect(states.at(-1)).toBe('saved'));
  });

  it('continues with the newest write after an older write fails', async () => {
    const save = vi
      .fn<(marks: BodyMark[]) => Promise<void>>()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce();
    const states: MarkSaveState[] = [];
    const queue = new MarkSaveQueue(save, (state) => states.push(state));

    queue.enqueue(first);
    queue.enqueue(second);
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(states.at(-1)).toBe('saved'));
  });

  it('exposes when all queued writes have finished', async () => {
    const pending = deferred();
    const save = vi
      .fn<(marks: BodyMark[]) => Promise<void>>()
      .mockReturnValue(pending.promise);
    const queue = new MarkSaveQueue(save, () => undefined);
    let idle = false;

    queue.enqueue(first);
    void queue.waitForIdle().then(() => {
      idle = true;
    });
    await Promise.resolve();
    expect(idle).toBe(false);

    pending.resolve();
    await queue.waitForIdle();
    expect(idle).toBe(true);
  });
});
