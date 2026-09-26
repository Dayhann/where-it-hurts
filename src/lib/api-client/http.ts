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
import type { z } from 'zod';

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      json &&
      typeof json === 'object' &&
      'message' in json &&
      typeof json.message === 'string'
        ? json.message
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return schema.parse(json);
}

export function createHttpApi(): ApiClient {
  return {
    createSession(body) {
      return request('/api/sessions', CreateSessionResponseSchema, {
        method: 'POST',
        body: JSON.stringify(CreateSessionRequestSchema.parse(body)),
      });
    },
    getSession(id) {
      return request(`/api/sessions/${id}`, GetSessionResponseSchema);
    },
    putMarks(id, body) {
      return request(`/api/sessions/${id}/marks`, PutMarksResponseSchema, {
        method: 'PUT',
        body: JSON.stringify(PutMarksRequestSchema.parse(body)),
      });
    },
    postMessage(id, body) {
      return request(
        `/api/sessions/${id}/messages`,
        PostMessageResponseSchema,
        {
          method: 'POST',
          body: JSON.stringify(PostMessageRequestSchema.parse(body)),
        },
      );
    },
    getRecap(id) {
      return request(`/api/sessions/${id}/recap`, GetRecapResponseSchema);
    },
    confirm(id, body) {
      return request(`/api/sessions/${id}/confirm`, ConfirmResponseSchema, {
        method: 'POST',
        body: JSON.stringify(ConfirmRequestSchema.parse(body)),
      });
    },
    getSummary(id) {
      return request(`/api/sessions/${id}/summary`, GetSummaryResponseSchema);
    },
    postFeedback(id, body) {
      return request(
        `/api/sessions/${id}/feedback`,
        PostFeedbackResponseSchema,
        {
          method: 'POST',
          body: JSON.stringify(PostFeedbackRequestSchema.parse(body)),
        },
      );
    },
    getClinicQueue() {
      return request('/api/clinic/queue', GetClinicQueueResponseSchema);
    },
  };
}
