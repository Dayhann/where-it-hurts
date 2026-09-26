import { z } from 'zod';
import type {
  AssistantTurn,
  BodyMark,
  ClinicianSummary,
  FactStatus,
  Lang,
  Message,
  PatientRecapLine,
  Question,
  QuestionOption,
  RedFlagHit,
  Session,
  SessionStatus,
  SlotFact,
  SocratesSlot,
  SummaryLine,
} from './types';

export const LangSchema: z.ZodType<Lang> = z.enum(['en', 'ar']);

export const SocratesSlotSchema: z.ZodType<SocratesSlot> = z.enum([
  'site',
  'onset',
  'character',
  'radiation',
  'associated',
  'timing',
  'exacerbating',
  'relieving',
  'severity',
  'meds_tried',
]);

export const RegionIdSchema = z.string().min(1);

export const PointSchema: z.ZodType<[number, number, number]> = z.tuple([
  z.number(),
  z.number(),
  z.number(),
]);

export const BodyMarkSchema: z.ZodType<BodyMark> = z.object({
  id: z.string().min(1),
  regionId: RegionIdSchema,
  point: PointSchema,
  kind: z.enum(['pain', 'spread']),
  intensity: z.number().min(0).max(10).optional(),
  createdAt: z.string().min(1),
});

export const MessageSchema: z.ZodType<Message> = z.object({
  id: z.string().min(1),
  role: z.enum(['patient', 'assistant']),
  text: z.string(),
  textEn: z.string().optional(),
  questionId: z.string().min(1).optional(),
  choiceId: z.string().min(1).optional(),
  inputMode: z.enum(['text', 'voice', 'choice']).optional(),
  createdAt: z.string().min(1),
});

export const FactStatusSchema: z.ZodType<FactStatus> = z.enum([
  'answered',
  'unsure',
  'denied',
]);

export const SlotFactSchema: z.ZodType<SlotFact> = z.object({
  slot: SocratesSlotSchema,
  value: z.string(),
  status: FactStatusSchema,
  sourceMessageIds: z.array(z.string().min(1)),
  quote: z.string(),
});

export const LocalizedTextSchema: z.ZodType<Record<Lang, string>> = z.object({
  en: z.string(),
  ar: z.string(),
});

export const QuestionOptionSchema: z.ZodType<QuestionOption> = z.object({
  id: z.string().min(1),
  label: LocalizedTextSchema,
});

export const QuestionSchema: z.ZodType<Question> = z.object({
  id: z.string().min(1),
  slot: z.union([SocratesSlotSchema, z.literal('redflag')]),
  kind: z.enum(['open', 'single', 'multi', 'scale', 'bodymap']),
  text: LocalizedTextSchema,
  options: z.array(QuestionOptionSchema).optional(),
  mandatory: z.boolean().optional(),
  appliesTo: z.array(z.string().min(1)).optional(),
});

export const RedFlagHitSchema: z.ZodType<RedFlagHit> = z.object({
  ruleId: z.string().min(1),
  label: z.string().min(1),
  sourceMessageId: z.string().min(1),
});

export const SessionStatusSchema: z.ZodType<SessionStatus> = z.enum([
  'in_progress',
  'redflag_stopped',
  'awaiting_confirm',
  'confirmed',
]);

export const SessionSchema: z.ZodType<Session> = z.object({
  id: z.string().min(1),
  appointment: z.object({
    patientDisplayName: z.string().min(1),
    clinician: z.string().min(1),
    startsAt: z.string().min(1),
  }),
  lang: LangSchema,
  carerMode: z.boolean(),
  status: SessionStatusSchema,
  marks: z.array(BodyMarkSchema),
  messages: z.array(MessageSchema),
  facts: z.array(SlotFactSchema),
  askedQuestionIds: z.array(z.string().min(1)),
  redFlags: z.array(RedFlagHitSchema),
  bodySnapshots: z
    .object({
      front: z.string().optional(),
      back: z.string().optional(),
    })
    .optional(),
  createdAt: z.string().min(1),
});

export const SummaryLineSchema: z.ZodType<SummaryLine> = z.object({
  text: z.string(),
  slot: SocratesSlotSchema,
  sourceMessageIds: z.array(z.string().min(1)),
  quotes: z.array(z.string()),
  verified: z.boolean(),
});

export const ClinicianSummarySchema: z.ZodType<ClinicianSummary> = z.object({
  sessionId: z.string().min(1),
  redFlags: z.array(RedFlagHitSchema),
  headline: z.array(z.string()).max(3),
  lines: z.array(SummaryLineSchema),
  notAsked: z.array(SocratesSlotSchema),
  unsure: z.array(SocratesSlotSchema),
  clarify: z.array(z.string()).max(3),
  aiLabel: z.literal('AI-drafted from patient answers. Verify before use.'),
  generatedAt: z.string().min(1),
});

export const PatientRecapLineSchema: z.ZodType<PatientRecapLine> = z.object({
  text: z.string(),
  slot: SocratesSlotSchema,
  editable: z.literal(true),
});

const QuestionTurnSchema = z.object({
  type: z.literal('question'),
  message: MessageSchema,
  question: QuestionSchema,
  progress: z.object({
    asked: z.number().int().nonnegative(),
    estimatedTotal: z.number().int().positive(),
  }),
});

const RedFlagStopTurnSchema = z.object({
  type: z.literal('redflag_stop'),
  hits: z.array(RedFlagHitSchema).min(1),
});

const DoneTurnSchema = z.object({
  type: z.literal('done'),
});

export const AssistantTurnSchema: z.ZodType<AssistantTurn> =
  z.discriminatedUnion('type', [
    QuestionTurnSchema,
    RedFlagStopTurnSchema,
    DoneTurnSchema,
  ]);
