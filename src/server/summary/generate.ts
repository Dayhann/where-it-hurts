import { z } from 'zod';
import {
  ClinicianSummarySchema,
  SocratesSlotSchema,
} from '@/contracts/schemas';
import type {
  ClinicianSummary,
  Session,
  SocratesSlot,
  SummaryLine,
} from '@/contracts/types';
import type { LlmProvider } from '@/server/llm/provider';
import { summarisePrompt } from '@/server/llm/prompts/summarise';
import { verifyLine } from './validate';

const ALL_SLOTS: SocratesSlot[] = [
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
];

const DraftSchema = z.object({
  lines: z
    .array(
      z.object({
        text: z.string().trim().min(1),
        slot: SocratesSlotSchema,
        sourceMessageIds: z.array(z.string().min(1)),
        quotes: z.array(z.string()),
      }),
    )
    .max(6),
  clarify: z.array(z.string().trim().min(1)).max(3),
});

function factFallback(session: Session): z.infer<typeof DraftSchema> {
  return {
    lines: session.facts.slice(0, 6).map((fact) => ({
      text: fact.quote,
      slot: fact.slot,
      sourceMessageIds: fact.sourceMessageIds,
      quotes: [fact.quote],
    })),
    clarify: [],
  };
}

/** Create a clinician draft while keeping verification and coverage in code. */
export async function generateSummary(
  provider: LlmProvider,
  session: Session,
  now: () => string = () => new Date().toISOString(),
): Promise<ClinicianSummary> {
  let draft: z.infer<typeof DraftSchema>;
  try {
    draft = DraftSchema.parse(
      await provider.completeJson(summarisePrompt(session), DraftSchema),
    );
  } catch {
    draft = factFallback(session);
  }
  const lines: SummaryLine[] = draft.lines.map((line) =>
    verifyLine({ ...line, verified: false }, session.messages),
  );
  const factsBySlot = new Map(session.facts.map((fact) => [fact.slot, fact]));
  return ClinicianSummarySchema.parse({
    sessionId: session.id,
    redFlags: session.redFlags,
    headline: lines
      .filter((line) => line.verified)
      .slice(0, 3)
      .map((line) => line.text),
    lines,
    notAsked: ALL_SLOTS.filter((slot) => !factsBySlot.has(slot)),
    unsure: ALL_SLOTS.filter(
      (slot) => factsBySlot.get(slot)?.status === 'unsure',
    ),
    clarify: draft.clarify,
    aiLabel: 'AI-drafted from patient answers. Verify before use.',
    generatedAt: now(),
  });
}
