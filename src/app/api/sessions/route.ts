import {
  CreateSessionRequestSchema,
  CreateSessionResponseSchema,
} from '@/contracts/api';
import { body, respond, serverApi } from '@/server/api/http';

export async function POST(request: Request) {
  return respond(CreateSessionResponseSchema, async () =>
    serverApi().createSession(await body(request, CreateSessionRequestSchema)),
  );
}
