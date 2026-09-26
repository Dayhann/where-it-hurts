import { describe, expect, it } from 'vitest';
import type { SpeechResultEvent } from './voice';
import { recognitionLanguage, recognitionTranscript } from './voice';

describe('recognitionLanguage', () => {
  it('uses Australian English and Arabic recognition tags', () => {
    expect(recognitionLanguage('en')).toBe('en-AU');
    expect(recognitionLanguage('ar')).toBe('ar');
  });
});

describe('recognitionTranscript', () => {
  it('joins interim and final result text', () => {
    const event = {
      results: {
        0: { 0: { transcript: 'my lower back ' }, isFinal: true },
        1: { 0: { transcript: 'aches' }, isFinal: false },
        length: 2,
      },
    } as unknown as SpeechResultEvent;

    expect(recognitionTranscript(event)).toBe('my lower back aches');
  });
});
