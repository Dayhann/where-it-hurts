import { PutMarksRequestSchema, PutMarksResponseSchema } from '@/contracts/api';
import { body, respond, serverApi } from '@/server/api/http';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return respond(PutMarksResponseSchema, async () =>
    serverApi().putMarks(
      (await params).id,
      await body(request, PutMarksRequestSchema),
    ),
  );
}
