import { z } from 'zod';
import type { Question, Session } from '@/contracts/types';
import type { LlmProvider } from './provider';
import { selectPrompt } from './prompts/select';

const SelectionSchema = z.object({
  questionId: z.string().min(1),
  reason: z
    .string()
    .trim()
    .refine((reason) => reason === '' || reason.split(/\s+/u).length <= 12),
});

/** Return only a question ID that was offered; the engine owns all fallback choices. */
export async function selectQuestionId(
  provider: LlmProvider,
  candidates: Question[],
  session: Session,
): Promise<string | undefined> {
  if (!candidates.length) return undefined;
  try {
    const selection = SelectionSchema.parse(
      await provider.completeJson(
        selectPrompt(candidates, session),
        SelectionSchema,
      ),
    );
    return candidates.some((question) => question.id === selection.questionId)
      ? selection.questionId
      : undefined;
  } catch {
    return undefined;
  }
}
