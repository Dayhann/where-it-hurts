import { describe, expect, it } from 'vitest';
import { checkinStep } from './steps';

describe('checkinStep', () => {
  it('starts on the body map', () => {
    expect(checkinStep({ chatStarted: false, turn: null })).toBe(0);
  });

  it('moves to questions once the chat has started', () => {
    expect(checkinStep({ chatStarted: true, turn: null })).toBe(1);
  });

  it('moves to the recap when the questions are done', () => {
    expect(checkinStep({ chatStarted: true, turn: { type: 'done' } })).toBe(2);
  });

  it('marks every step complete after the recap is confirmed', () => {
    expect(
      checkinStep({
        chatStarted: true,
        turn: { type: 'done' },
        confirmed: true,
      }),
    ).toBe(3);
  });
});
