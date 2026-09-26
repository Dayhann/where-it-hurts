import { describe, expect, it } from 'vitest';
import {
  ConfirmRequestSchema,
  CreateSessionRequestSchema,
  GetClinicQueueResponseSchema,
  PostMessageRequestSchema,
  PutMarksRequestSchema,
} from './api';
import { REGIONS, REGION_BY_ID } from './regions';
import {
  AssistantTurnSchema,
  ClinicianSummarySchema,
  PatientRecapLineSchema,
  SessionSchema,
} from './schemas';
import type {
  AssistantTurn,
  ClinicianSummary,
  PatientRecapLine,
  Session,
} from './types';

const now = '2026-09-26T02:00:00.000Z';

const session: Session = {
  id: 'ses_demo_001',
  appointment: {
    patientDisplayName: 'Alex Demo',
    clinician: 'Dr Kim',
    startsAt: '2026-09-26T09:30:00.000Z',
  },
  lang: 'en',
  carerMode: false,
  status: 'in_progress',
  marks: [
    {
      id: 'mark_1',
      regionId: 'lower_back_left',
      point: [0.1, 0.9, -0.05],
      kind: 'pain',
      intensity: 6,
      createdAt: now,
    },
    {
      id: 'mark_2',
      regionId: 'thigh_back_left',
      point: [0.12, 0.55, -0.08],
      kind: 'spread',
      createdAt: now,
    },
  ],
  messages: [
    {
      id: 'msg_p1',
      role: 'patient',
      text: "it's a weird pulling feeling around my side that sometimes goes down my leg",
      inputMode: 'text',
      createdAt: now,
    },
    {
      id: 'msg_a1',
      role: 'assistant',
      text: 'When did it start?',
      questionId: 'Q_ONSET',
      createdAt: now,
    },
  ],
  facts: [
    {
      slot: 'site',
      value: 'left lower back radiating to posterior left thigh',
      status: 'answered',
      sourceMessageIds: ['msg_p1'],
      quote: 'pulling feeling around my side that sometimes goes down my leg',
    },
  ],
  askedQuestionIds: ['Q_OPEN'],
  redFlags: [],
  createdAt: now,
};

const questionTurn: AssistantTurn = {
  type: 'question',
  message: {
    id: 'msg_a2',
    role: 'assistant',
    text: 'When did it start?',
    questionId: 'Q_ONSET',
    createdAt: now,
  },
  question: {
    id: 'Q_ONSET',
    slot: 'onset',
    kind: 'single',
    text: { en: 'When did it start?', ar: 'متى بدأ؟' },
    options: [
      { id: 'today', label: { en: 'Today', ar: 'اليوم' } },
      { id: 'not_sure', label: { en: 'Not sure', ar: 'لست متأكدًا' } },
      {
        id: 'something_else',
        label: { en: 'Something else', ar: 'شيء آخر' },
      },
    ],
  },
  progress: { asked: 1, estimatedTotal: 7 },
};

const summary: ClinicianSummary = {
  sessionId: 'ses_demo_001',
  redFlags: [],
  headline: [
    'Left lower back pain radiating to posterior left thigh',
    'Intermittent pulling sensation',
  ],
  lines: [
    {
      text: 'Left lower back pain radiating to posterior left thigh',
      slot: 'site',
      sourceMessageIds: ['msg_p1'],
      quotes: [
        'pulling feeling around my side that sometimes goes down my leg',
      ],
      verified: true,
    },
  ],
  notAsked: ['relieving', 'meds_tried'],
  unsure: [],
  clarify: ['Confirm whether pain is worse sitting or standing'],
  aiLabel: 'AI-drafted from patient answers. Verify before use.',
  generatedAt: now,
};

const recapLine: PatientRecapLine = {
  text: 'You said the pain pulls from your left side down your leg.',
  slot: 'site',
  editable: true,
};

describe('contract schemas', () => {
  it('parses a session in progress', () => {
    expect(SessionSchema.parse(session).id).toBe('ses_demo_001');
  });

  it('parses each AssistantTurn variant', () => {
    expect(AssistantTurnSchema.parse(questionTurn).type).toBe('question');
    expect(
      AssistantTurnSchema.parse({
        type: 'redflag_stop',
        hits: [
          {
            ruleId: 'RF_CAUDA_SADDLE',
            label: 'Possible saddle anaesthesia',
            sourceMessageId: 'msg_p1',
          },
        ],
      }).type,
    ).toBe('redflag_stop');
    expect(AssistantTurnSchema.parse({ type: 'done' }).type).toBe('done');
  });

  it('parses a clinician summary and recap line', () => {
    expect(ClinicianSummarySchema.parse(summary).headline).toHaveLength(2);
    expect(PatientRecapLineSchema.parse(recapLine).editable).toBe(true);
  });

  it('parses API request and queue shapes', () => {
    expect(
      CreateSessionRequestSchema.parse({
        appointment: session.appointment,
        lang: 'en',
        carerMode: false,
      }).lang,
    ).toBe('en');
    expect(
      PutMarksRequestSchema.parse({ marks: session.marks }).marks,
    ).toHaveLength(2);
    expect(
      PostMessageRequestSchema.parse({
        text: 'A few weeks ago',
        choiceId: 'weeks',
        inputMode: 'choice',
      }).choiceId,
    ).toBe('weeks');
    expect(ConfirmRequestSchema.parse({ edits: [] }).edits).toEqual([]);
    expect(
      GetClinicQueueResponseSchema.parse({
        items: [
          {
            sessionId: session.id,
            patientDisplayName: 'Alex Demo',
            startsAt: session.appointment.startsAt,
            status: 'in_progress',
            redFlag: false,
          },
        ],
      }).items,
    ).toHaveLength(1);
  });

  it('does not enforce quote matching (that is B-07 validate.ts)', () => {
    expect(
      ClinicianSummarySchema.parse({
        ...summary,
        lines: [
          {
            text: 'Unverified line',
            slot: 'site',
            sourceMessageIds: [],
            quotes: [],
            verified: false,
          },
        ],
      }).lines[0]?.verified,
    ).toBe(false);
  });
});

describe('regions', () => {
  it('has unique ids and about 35 musculoskeletal regions', () => {
    const ids = REGIONS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(REGIONS.length).toBeGreaterThanOrEqual(30);
    expect(REGIONS.length).toBeLessThanOrEqual(40);
  });

  it('puts buttocks and posterior thigh/calf in the back group', () => {
    expect(REGION_BY_ID.buttock_left?.group).toBe('back');
    expect(REGION_BY_ID.thigh_back_left?.group).toBe('back');
    expect(REGION_BY_ID.calf_left?.group).toBe('back');
  });

  it('leaves anchors empty until calibration', () => {
    expect(REGIONS.every((r) => r.anchor === null)).toBe(true);
  });
});
