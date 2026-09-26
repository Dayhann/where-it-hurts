import { describe, expect, it } from 'vitest';
import type { ClinicianSummary } from '@/contracts/types';
import { summaryText } from './summary-text';

const summary: ClinicianSummary = {
  sessionId: 'synthetic-session',
  redFlags: [],
  headline: ['Left lower back pain', 'Started days ago'],
  lines: [
    {
      text: 'Left lower back pain',
      slot: 'site',
      sourceMessageIds: ['synthetic-message'],
      quotes: ['My left lower back hurts'],
      verified: true,
    },
    {
      text: 'Worst severity 6/10',
      slot: 'severity',
      sourceMessageIds: ['synthetic-severity'],
      quotes: ['Six out of ten'],
      verified: true,
    },
  ],
  notAsked: [],
  unsure: [],
  clarify: [],
  aiLabel: 'AI-drafted from patient answers. Verify before use.',
  generatedAt: '2026-09-26T09:00:00.000Z',
};

describe('summaryText', () => {
  it('copies headlines and remaining details without duplicates', () => {
    expect(summaryText(summary)).toBe(
      'Left lower back pain\nStarted days ago\nWorst severity 6/10',
    );
  });
});
