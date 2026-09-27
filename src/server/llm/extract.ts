import { z } from 'zod';
import { FactStatusSchema, SocratesSlotSchema } from '@/contracts/schemas';
import type { Message, Question, Session, SlotFact } from '@/contracts/types';
import type { LlmProvider } from './provider';
import { extractPrompt } from './prompts/extract';

const ExtractionSchema = z.object({
  facts: z
    .array(
      z.object({
        slot: SocratesSlotSchema,
        value: z.string().trim().min(1),
        status: FactStatusSchema,
        quote: z.string().trim().min(1),
      }),
    )
    .max(10),
});

function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[“”"']/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

/** A failed model call yields no new facts; the engine can continue with its fallback. */
export async function extractFacts(
  provider: LlmProvider,
  message: Message,
  session: Session,
  question: Question,
): Promise<SlotFact[]> {
  let result: z.infer<typeof ExtractionSchema>;
  try {
    result = await provider.completeJson(
      extractPrompt(message, session, question),
      ExtractionSchema,
    );
  } catch {
    return [];
  }
  return result.facts
    .filter((fact) =>
      [message.text, message.textEn].some(
        (text) =>
          Boolean(text) && normalize(text!).includes(normalize(fact.quote)),
      ),
    )
    .map((fact) => ({ ...fact, sourceMessageIds: [message.id] }));
}
