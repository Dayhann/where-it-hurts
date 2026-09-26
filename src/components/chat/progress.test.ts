import { describe, expect, it } from 'vitest';
import { progressLabel } from './progress';

describe('progressLabel', () => {
  it('uses the ticket wording for an in-progress question', () => {
    expect(progressLabel({ asked: 3, estimatedTotal: 7 })).toBe(
      'Question 3 of about 7',
    );
  });

  it('falls back before any question is asked', () => {
    expect(progressLabel({ asked: 0, estimatedTotal: 7 })).toBe(
      'A few questions',
    );
  });
});
