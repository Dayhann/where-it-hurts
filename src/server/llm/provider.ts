import { GoogleGenAI, type GenerateContentParameters } from '@google/genai';
import { z } from 'zod';
import { SYSTEM_PROMPT } from './prompts/system';

export interface LlmProvider {
  completeJson<T>(prompt: string, schema: z.ZodType<T>): Promise<T>;
}

type Generate = (
  request: GenerateContentParameters,
) => Promise<{ text?: string }>;

export class GeminiProvider implements LlmProvider {
  private readonly generate: Generate;

  constructor(
    private readonly model: string,
    apiKey: string,
    generate?: Generate,
  ) {
    if (!model.trim()) throw new Error('LLM_MODEL is required for Gemini');
    if (!apiKey.trim() && !generate)
      throw new Error('GEMINI_API_KEY is required for Gemini');
    this.generate =
      generate ?? new GoogleGenAI({ apiKey }).models.generateContent;
  }

  async completeJson<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await this.generate({
          model: this.model,
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: 0,
            responseMimeType: 'application/json',
            abortSignal: AbortSignal.timeout(8_000),
          },
        });
        if (!response.text)
          throw new Error('Gemini returned an empty response');
        return schema.parse(JSON.parse(response.text));
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error('Gemini JSON completion failed after one retry', {
      cause: lastError,
    });
  }
}

export function createLlmProvider(): LlmProvider {
  if (process.env.LLM_PROVIDER !== 'gemini') {
    throw new Error('Only LLM_PROVIDER=gemini is currently supported');
  }
  return new GeminiProvider(
    process.env.LLM_MODEL ?? '',
    process.env.GEMINI_API_KEY ?? '',
  );
}
