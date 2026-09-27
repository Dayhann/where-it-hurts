import type { LlmProvider } from '@/server/llm/provider';
import { extractFacts } from '@/server/llm/extract';
import { selectQuestionId } from '@/server/llm/select';
import type { EngineDependencies } from './conversation';

/** Inject both LLM steps into the engine; its deterministic safety check still runs first. */
export function llmEngineDependencies(
  provider: LlmProvider,
): EngineDependencies {
  return {
    extract: (message, session, question) =>
      extractFacts(provider, message, session, question),
    select: (candidates, session) =>
      selectQuestionId(provider, candidates, session),
  };
}
