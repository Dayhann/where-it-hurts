import { describe, expect, it } from 'vitest';
import { progressCount, progressLabel } from './progress';

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

  it('renders Arabic progress copy', () => {
    expect(progressLabel({ asked: 3, estimatedTotal: 8 }, 'ar')).toBe(
      'السؤال 3 من نحو 8',
    );
  });
});

describe('progressCount', () => {
  it('returns nothing before any question is asked', () => {
    expect(progressCount({ asked: 0, estimatedTotal: 7 })).toBeNull();
    expect(progressCount()).toBeNull();
  });

  it('never reports a total below one', () => {
    expect(progressCount({ asked: 2, estimatedTotal: 0 })).toEqual({
      asked: 2,
      total: 1,
    });
  });
});
