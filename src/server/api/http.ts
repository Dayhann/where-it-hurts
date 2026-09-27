import { z } from 'zod';
import { createServerApi, ApiError } from './service';
import { createLlmProvider } from '@/server/llm/provider';
import { getSessionStore } from '@/server/store';

let api: ReturnType<typeof createServerApi> | undefined;

export function serverApi() {
  if (!api) {
    let provider;
    try {
      provider = createLlmProvider();
    } catch {
      // Local development can use deterministic engine and summary fallbacks.
    }
    api = createServerApi(getSessionStore(), provider);
  }
  return api;
}

export async function body<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new ApiError('Expected a JSON request body', 400);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ApiError(
      `Invalid input: ${issue?.path.join('.') || 'body'} ${issue?.message ?? ''}`.trim(),
      400,
    );
  }
  return parsed.data;
}

export async function respond<T>(
  schema: z.ZodType<T>,
  run: () => Promise<T>,
): Promise<Response> {
  try {
    return Response.json(schema.parse(await run()));
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json(
        { message: error.message },
        { status: error.status },
      );
    }
    return Response.json({ message: 'Internal server error' }, { status: 500 });
  }
}
