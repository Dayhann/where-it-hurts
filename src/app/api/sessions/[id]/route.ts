import { GetSessionResponseSchema } from '@/contracts/api';
import { respond, serverApi } from '@/server/api/http';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return respond(GetSessionResponseSchema, async () =>
    serverApi().getSession((await params).id),
  );
}
