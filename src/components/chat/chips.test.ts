import { describe, expect, it } from 'vitest';
import type { Question } from '@/contracts/types';
import { NOT_SURE, SOMETHING_ELSE, payloadForChip, replyChips } from './chips';

const closed: Question = {
  id: 'Q_ONSET',
  slot: 'onset',
  kind: 'single',
  text: { en: 'When did it start?', ar: 'متى بدأت المشكلة؟' },
  options: [
    { id: 'today', label: { en: 'Today', ar: 'اليوم' } },
    NOT_SURE,
    SOMETHING_ELSE,
  ],
};

const open: Question = {
  id: 'Q_CHAR',
  slot: 'character',
  kind: 'open',
  text: { en: 'How does it feel?', ar: 'كيف تشعر؟' },
};

const scale: Question = {
  id: 'Q_SEV',
  slot: 'severity',
  kind: 'scale',
  text: { en: 'How bad is it?', ar: 'ما الشدة؟' },
};

describe('replyChips', () => {
  it('keeps closed-question options and still includes Not sure and Something else', () => {
    const ids = replyChips(closed).map((option) => option.id);
    expect(ids).toContain('today');
    expect(ids.filter((id) => id === 'not_sure')).toHaveLength(1);
    expect(ids.filter((id) => id === 'something_else')).toHaveLength(1);
  });

  it('adds Not sure and Something else when a question has no options', () => {
    expect(replyChips(open).map((option) => option.id)).toEqual([
      'not_sure',
      'something_else',
    ]);
  });

  it('adds 0–10 chips for scale questions', () => {
    const ids = replyChips(scale).map((option) => option.id);
    expect(ids[0]).toBe('scale_0');
    expect(ids[10]).toBe('scale_10');
    expect(ids).toContain('not_sure');
    expect(ids).toContain('something_else');
  });
});

describe('payloadForChip', () => {
  it('sends a known closed option as a choice', () => {
    expect(payloadForChip(closed.options![0], 'en', closed)).toEqual({
      text: 'Today',
      choiceId: 'today',
      inputMode: 'choice',
    });
  });

  it('sends a scale chip as free text so unknown choiceIds are not posted', () => {
    expect(
      payloadForChip(
        { id: 'scale_7', label: { en: '7', ar: '7' } },
        'en',
        scale,
      ),
    ).toEqual({ text: '7', inputMode: 'text' });
  });
});
