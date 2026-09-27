import {
  PostMessageRequestSchema,
  PostMessageResponseSchema,
} from '@/contracts/api';
import { body, respond, serverApi } from '@/server/api/http';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return respond(PostMessageResponseSchema, async () =>
    serverApi().postMessage(
      (await params).id,
      await body(request, PostMessageRequestSchema),
    ),
  );
}
