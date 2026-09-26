import type { BodyMark } from '@/contracts/types';

export type MarkSaveState = 'saving' | 'saved' | 'local';

/**
 * Serialises mark writes so an older, slower request can never overwrite a
 * newer set of marks on the server.
 */
export class MarkSaveQueue {
  private tail: Promise<void> = Promise.resolve();
  private latestVersion = 0;

  constructor(
    private readonly save: (marks: BodyMark[]) => Promise<unknown>,
    private readonly onStateChange: (state: MarkSaveState) => void,
  ) {}

  enqueue(marks: BodyMark[]): void {
    const version = ++this.latestVersion;
    const snapshot = structuredClone(marks);
    this.onStateChange('saving');

    const write = this.tail.then(() => this.save(snapshot));
    this.tail = write.then(
      () => undefined,
      () => undefined,
    );

    void write.then(
      () => {
        if (version === this.latestVersion) this.onStateChange('saved');
      },
      () => {
        if (version === this.latestVersion) this.onStateChange('local');
      },
    );
  }

  waitForIdle(): Promise<void> {
    return this.tail;
  }
}
