import { ClinicianSummarySchema, SessionSchema } from '@/contracts/schemas';

const createdAt = '2026-09-26T09:00:00.000Z';
const startsAt = '2026-09-26T10:00:00.000Z';

/** Synthetic cases for the UI. No patient information belongs in these fixtures. */
export const mockSessions = SessionSchema.array().parse([
  {
    id: 'mock-in-progress',
    appointment: {
      patientDisplayName: 'Alex Demo',
      clinician: 'Dr Morgan Demo',
      startsAt,
    },
    lang: 'en',
    carerMode: false,
    status: 'in_progress',
    marks: [
      {
        id: 'mark-alex-1',
        regionId: 'lower_back_left',
        point: [-0.2, 0.6, -0.1],
        kind: 'pain',
        intensity: 5,
        createdAt,
      },
    ],
    messages: [
      {
        id: 'alex-question-open',
        role: 'assistant',
        questionId: 'Q_OPEN',
        text: "What's the issue? Tell us in your own words.",
        createdAt,
      },
      {
        id: 'alex-answer-open',
        role: 'patient',
        text: 'My left lower back has been aching.',
        inputMode: 'text',
        createdAt,
      },
      {
        id: 'alex-question-onset',
        role: 'assistant',
        questionId: 'Q_ONSET',
        text: 'When did it start?',
        createdAt,
      },
    ],
    facts: [
      {
        slot: 'site',
        value: 'left lower back aching',
        status: 'answered',
        sourceMessageIds: ['alex-answer-open'],
        quote: 'My left lower back has been aching.',
      },
    ],
    askedQuestionIds: ['Q_OPEN', 'Q_ONSET'],
    redFlags: [],
    createdAt,
  },
  {
    id: 'mock-red-flag',
    appointment: {
      patientDisplayName: 'Sam Demo',
      clinician: 'Dr Morgan Demo',
      startsAt,
    },
    lang: 'en',
    carerMode: false,
    status: 'redflag_stopped',
    marks: [],
    messages: [
      {
        id: 'sam-question-open',
        role: 'assistant',
        questionId: 'Q_OPEN',
        text: "What's the issue? Tell us in your own words.",
        createdAt,
      },
      {
        id: 'sam-answer-open',
        role: 'patient',
        text: 'I have chest pain.',
        inputMode: 'text',
        createdAt,
      },
    ],
    facts: [],
    askedQuestionIds: ['Q_OPEN'],
    redFlags: [
      {
        ruleId: 'RF_CHEST',
        label: 'Chest pain',
        sourceMessageId: 'sam-answer-open',
      },
    ],
    createdAt,
  },
  {
    id: 'mock-confirmed',
    appointment: {
      patientDisplayName: 'Taylor Demo',
      clinician: 'Dr Morgan Demo',
      startsAt,
    },
    lang: 'en',
    carerMode: false,
    status: 'confirmed',
    marks: [
      {
        id: 'mark-taylor-1',
        regionId: 'lower_back_left',
        point: [-0.2, 0.6, -0.1],
        kind: 'pain',
        intensity: 6,
        createdAt,
      },
      {
        id: 'mark-taylor-2',
        regionId: 'thigh_back_left',
        point: [-0.2, 0.25, -0.1],
        kind: 'spread',
        createdAt,
      },
    ],
    messages: [
      {
        id: 'taylor-question-open',
        role: 'assistant',
        questionId: 'Q_OPEN',
        text: "What's the issue? Tell us in your own words.",
        createdAt,
      },
      {
        id: 'taylor-answer-open',
        role: 'patient',
        text: 'My left lower back aches and the pain goes down my left leg.',
        inputMode: 'text',
        createdAt,
      },
      {
        id: 'taylor-question-onset',
        role: 'assistant',
        questionId: 'Q_ONSET',
        text: 'When did it start?',
        createdAt,
      },
      {
        id: 'taylor-answer-onset',
        role: 'patient',
        text: 'A few weeks ago.',
        inputMode: 'choice',
        choiceId: 'weeks',
        createdAt,
      },
      {
        id: 'taylor-question-severity',
        role: 'assistant',
        questionId: 'Q_SEV',
        text: 'On a scale of 0 to 10, how bad is it at its worst?',
        createdAt,
      },
      {
        id: 'taylor-answer-severity',
        role: 'patient',
        text: 'Six out of ten.',
        inputMode: 'text',
        createdAt,
      },
    ],
    facts: [
      {
        slot: 'site',
        value: 'left lower back pain',
        status: 'answered',
        sourceMessageIds: ['taylor-answer-open'],
        quote: 'My left lower back aches',
      },
      {
        slot: 'radiation',
        value: 'down left leg',
        status: 'answered',
        sourceMessageIds: ['taylor-answer-open'],
        quote: 'the pain goes down my left leg',
      },
      {
        slot: 'onset',
        value: 'a few weeks ago',
        status: 'answered',
        sourceMessageIds: ['taylor-answer-onset'],
        quote: 'A few weeks ago.',
      },
      {
        slot: 'severity',
        value: '6/10 at worst',
        status: 'answered',
        sourceMessageIds: ['taylor-answer-severity'],
        quote: 'Six out of ten.',
      },
    ],
    askedQuestionIds: ['Q_OPEN', 'Q_ONSET', 'Q_SEV'],
    redFlags: [],
    createdAt,
  },
]);

export const mockConfirmedSummary = ClinicianSummarySchema.parse({
  sessionId: 'mock-confirmed',
  redFlags: [],
  headline: [
    'Left lower back pain extending down left leg',
    'Started a few weeks ago',
    'Worst severity 6/10',
  ],
  lines: [
    {
      text: 'Left lower back pain extending down left leg',
      slot: 'site',
      sourceMessageIds: ['taylor-answer-open'],
      quotes: ['My left lower back aches', 'the pain goes down my left leg'],
      verified: true,
    },
    {
      text: 'Started a few weeks ago',
      slot: 'onset',
      sourceMessageIds: ['taylor-answer-onset'],
      quotes: ['A few weeks ago.'],
      verified: true,
    },
    {
      text: 'Worst severity 6/10',
      slot: 'severity',
      sourceMessageIds: ['taylor-answer-severity'],
      quotes: ['Six out of ten.'],
      verified: true,
    },
  ],
  notAsked: [
    'character',
    'associated',
    'timing',
    'exacerbating',
    'relieving',
    'meds_tried',
  ],
  unsure: [],
  clarify: ['Ask what makes the pain better or worse.'],
  aiLabel: 'AI-drafted from patient answers. Verify before use.',
  generatedAt: createdAt,
});
