import { describe, expect, it } from 'vitest';
import type { PatientRecapLine } from '@/contracts/types';
import { recapEdits } from './recap';

describe('recapEdits', () => {
  it('keeps the edited text paired with its slot', () => {
    const lines: PatientRecapLine[] = [
      {
        slot: 'site',
        text: 'You said: My left lower back aches.',
        editable: true,
      },
      {
        slot: 'onset',
        text: 'You said: It started a few days ago.',
        editable: true,
      },
    ];

    expect(recapEdits(lines)).toEqual([
      { slot: 'site', text: 'You said: My left lower back aches.' },
      { slot: 'onset', text: 'You said: It started a few days ago.' },
    ]);
  });
});
