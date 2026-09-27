import {
  PostFeedbackRequestSchema,
  PostFeedbackResponseSchema,
} from '@/contracts/api';
import { body, respond, serverApi } from '@/server/api/http';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return respond(PostFeedbackResponseSchema, async () =>
    serverApi().postFeedback(
      (await params).id,
      await body(request, PostFeedbackRequestSchema),
    ),
  );
}
