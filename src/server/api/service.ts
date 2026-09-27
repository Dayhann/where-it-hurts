import { nanoid } from 'nanoid';
import type { ApiClient } from '@/contracts/api';
import {
  ConfirmRequestSchema,
  ConfirmResponseSchema,
  CreateSessionRequestSchema,
  CreateSessionResponseSchema,
  GetClinicQueueResponseSchema,
  GetRecapResponseSchema,
  GetSessionResponseSchema,
  GetSummaryResponseSchema,
  PostFeedbackRequestSchema,
  PostFeedbackResponseSchema,
  PostMessageRequestSchema,
  PostMessageResponseSchema,
  PutMarksRequestSchema,
  PutMarksResponseSchema,
} from '@/contracts/api';
import type {
  ClinicianSummary,
  Session,
  SocratesSlot,
} from '@/contracts/types';
import {
  handlePatientMessage,
  startConversation,
  withRecoveredFacts,
} from '@/server/engine/conversation';
import { llmEngineDependencies } from '@/server/engine/llm-deps';
import type { LlmProvider } from '@/server/llm/provider';
import { generateAnswerRecap } from '@/server/recap/generate';
import type { SessionStore } from '@/server/store/types';
import { generateSummary } from '@/server/summary/generate';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** The API's stateful behavior, shared by route handlers and contract tests. */
export function createServerApi(
  store: SessionStore,
  provider?: LlmProvider,
): ApiClient {
  const recapEdits = new Map<string, { slot: SocratesSlot; text: string }[]>();
  const summaries = new Map<string, ClinicianSummary>();
  const feedback = new Map<string, { lineIndex: number; note: string }[]>();

  async function get(id: string): Promise<Session> {
    if (!id.trim()) throw new ApiError('Session ID is required', 400);
    const session = await store.get(id);
    if (!session) throw new ApiError('Session was not found', 404);
    return session;
  }

  async function summaryFor(session: Session): Promise<ClinicianSummary> {
    const cached = summaries.get(session.id);
    if (cached) return cached;
    const unavailable: LlmProvider = {
      async completeJson() {
        throw new Error('LLM unavailable');
      },
    };
    const summary = await generateSummary(
      provider ?? unavailable,
      withRecoveredFacts(session),
    );
    summaries.set(session.id, summary);
    return summary;
  }

  return {
    async createSession(body) {
      const input = CreateSessionRequestSchema.parse(body);
      const fresh: Session = {
        id: nanoid(),
        appointment: input.appointment,
        lang: input.lang,
        carerMode: input.carerMode,
        status: 'in_progress',
        marks: [],
        messages: [],
        facts: [],
        askedQuestionIds: [],
        redFlags: [],
        createdAt: new Date().toISOString(),
      };
      const { session, turn } = startConversation(fresh);
      await store.create(session);
      return CreateSessionResponseSchema.parse({ session, firstTurn: turn });
    },

    async getSession(id) {
      return GetSessionResponseSchema.parse({ session: await get(id) });
    },

    async putMarks(id, body) {
      const input = PutMarksRequestSchema.parse(body);
      const session = await get(id);
      session.marks = input.marks;
      if (input.snapshots) session.bodySnapshots = input.snapshots;
      await store.update(session);
      return PutMarksResponseSchema.parse({ ok: true });
    },

    async postMessage(id, body) {
      const input = PostMessageRequestSchema.parse(body);
      const session = await get(id);
      if (session.status !== 'in_progress') {
        throw new ApiError('Session is not accepting messages', 409);
      }
      let result: Awaited<ReturnType<typeof handlePatientMessage>>;
      try {
        result = await handlePatientMessage(
          session,
          input,
          provider ? llmEngineDependencies(provider) : {},
        );
      } catch (error) {
        if (
          error instanceof Error &&
          /^(Unknown choice|A message or choice)/u.test(error.message)
        ) {
          throw new ApiError(error.message, 400);
        }
        throw error;
      }
      await store.update(result.session);
      summaries.delete(id);
      return PostMessageResponseSchema.parse(result);
    },

    async getRecap(id) {
      const session = await get(id);
      const edits = recapEdits.get(id);
      const lines = generateAnswerRecap(session).map((line, index) => ({
        ...line,
        text:
          edits?.[index]?.slot === line.slot ? edits[index].text : line.text,
      }));
      return GetRecapResponseSchema.parse({ lines });
    },

    async confirm(id, body) {
      const input = ConfirmRequestSchema.parse(body);
      const session = await get(id);
      if (
        session.status !== 'awaiting_confirm' &&
        session.status !== 'confirmed'
      ) {
        throw new ApiError('Session is not ready to confirm', 409);
      }
      if (input.edits) {
        const lines = generateAnswerRecap(session);
        const ordered =
          input.edits.length === lines.length &&
          input.edits.every((edit, index) => edit.slot === lines[index]?.slot);
        recapEdits.set(
          id,
          lines.map((line, index) => ({
            slot: line.slot,
            text: ordered
              ? input.edits![index]!.text
              : (input.edits!.find((edit) => edit.slot === line.slot)?.text ??
                line.text),
          })),
        );
      }
      session.status = 'confirmed';
      await store.update(session);
      return ConfirmResponseSchema.parse({ ok: true });
    },

    async getSummary(id) {
      return GetSummaryResponseSchema.parse({
        summary: await summaryFor(await get(id)),
      });
    },

    async postFeedback(id, body) {
      const input = PostFeedbackRequestSchema.parse(body);
      const summary = await summaryFor(await get(id));
      if (input.lineIndex >= summary.lines.length) {
        throw new ApiError('Summary line does not exist', 400);
      }
      feedback.set(id, [...(feedback.get(id) ?? []), input]);
      return PostFeedbackResponseSchema.parse({ ok: true });
    },

    async getClinicQueue() {
      return GetClinicQueueResponseSchema.parse({
        items: await store.listQueue(),
      });
    },
  };
}
