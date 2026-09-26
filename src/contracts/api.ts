import { z } from 'zod';
import {
  AssistantTurnSchema,
  BodyMarkSchema,
  ClinicianSummarySchema,
  PatientRecapLineSchema,
  SessionSchema,
  SocratesSlotSchema,
} from './schemas';
import type { AssistantTurn, ClinicianSummary, Session } from './types';

export const AppointmentSchema = z.object({
  patientDisplayName: z.string().min(1),
  clinician: z.string().min(1),
  startsAt: z.string().min(1),
});

export const CreateSessionRequestSchema = z.object({
  appointment: AppointmentSchema,
  lang: z.enum(['en', 'ar']),
  carerMode: z.boolean(),
});

export const CreateSessionResponseSchema = z.object({
  session: SessionSchema,
  firstTurn: AssistantTurnSchema,
});

export const GetSessionResponseSchema = z.object({
  session: SessionSchema,
});

export const PutMarksRequestSchema = z.object({
  marks: z.array(BodyMarkSchema),
  snapshots: z
    .object({
      front: z.string().optional(),
      back: z.string().optional(),
    })
    .optional(),
});

export const PutMarksResponseSchema = z.object({
  ok: z.literal(true),
});

export const PostMessageRequestSchema = z.object({
  text: z.string(),
  choiceId: z.string().min(1).optional(),
  inputMode: z.enum(['text', 'voice', 'choice']).optional(),
});

export const PostMessageResponseSchema = z.object({
  turn: AssistantTurnSchema,
  session: SessionSchema,
});

export const GetRecapResponseSchema = z.object({
  lines: z.array(PatientRecapLineSchema),
});

export const ConfirmRequestSchema = z.object({
  edits: z
    .array(
      z.object({
        slot: SocratesSlotSchema,
        text: z.string(),
      }),
    )
    .optional(),
});

export const ConfirmResponseSchema = z.object({
  ok: z.literal(true),
});

export const GetSummaryResponseSchema = z.object({
  summary: ClinicianSummarySchema,
});

export const PostFeedbackRequestSchema = z.object({
  lineIndex: z.number().int().nonnegative(),
  note: z.string(),
});

export const PostFeedbackResponseSchema = z.object({
  ok: z.literal(true),
});

export const ClinicQueueItemSchema = z.object({
  sessionId: z.string().min(1),
  patientDisplayName: z.string().min(1),
  startsAt: z.string().min(1),
  status: z.enum([
    'in_progress',
    'redflag_stopped',
    'awaiting_confirm',
    'confirmed',
  ]),
  redFlag: z.boolean(),
});

export const GetClinicQueueResponseSchema = z.object({
  items: z.array(ClinicQueueItemSchema),
});

export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;
export type CreateSessionResponse = z.infer<typeof CreateSessionResponseSchema>;
export type GetSessionResponse = z.infer<typeof GetSessionResponseSchema>;
export type PutMarksRequest = z.infer<typeof PutMarksRequestSchema>;
export type PutMarksResponse = z.infer<typeof PutMarksResponseSchema>;
export type PostMessageRequest = z.infer<typeof PostMessageRequestSchema>;
export type PostMessageResponse = z.infer<typeof PostMessageResponseSchema>;
export type GetRecapResponse = z.infer<typeof GetRecapResponseSchema>;
export type ConfirmRequest = z.infer<typeof ConfirmRequestSchema>;
export type ConfirmResponse = z.infer<typeof ConfirmResponseSchema>;
export type GetSummaryResponse = z.infer<typeof GetSummaryResponseSchema>;
export type PostFeedbackRequest = z.infer<typeof PostFeedbackRequestSchema>;
export type PostFeedbackResponse = z.infer<typeof PostFeedbackResponseSchema>;
export type GetClinicQueueResponse = z.infer<
  typeof GetClinicQueueResponseSchema
>;

export interface ApiClient {
  createSession(body: CreateSessionRequest): Promise<CreateSessionResponse>;
  getSession(id: string): Promise<{ session: Session }>;
  putMarks(id: string, body: PutMarksRequest): Promise<PutMarksResponse>;
  postMessage(
    id: string,
    body: PostMessageRequest,
  ): Promise<{ turn: AssistantTurn; session: Session }>;
  getRecap(id: string): Promise<GetRecapResponse>;
  confirm(id: string, body: ConfirmRequest): Promise<ConfirmResponse>;
  getSummary(id: string): Promise<{ summary: ClinicianSummary }>;
  postFeedback(
    id: string,
    body: PostFeedbackRequest,
  ): Promise<PostFeedbackResponse>;
  getClinicQueue(): Promise<GetClinicQueueResponse>;
}
