import { ConfirmRequestSchema, ConfirmResponseSchema } from '@/contracts/api';
import { body, respond, serverApi } from '@/server/api/http';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return respond(ConfirmResponseSchema, async () =>
    serverApi().confirm(
      (await params).id,
      await body(request, ConfirmRequestSchema),
    ),
  );
}
