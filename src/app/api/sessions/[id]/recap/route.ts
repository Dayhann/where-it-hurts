import { GetRecapResponseSchema } from '@/contracts/api';
import { respond, serverApi } from '@/server/api/http';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return respond(GetRecapResponseSchema, async () =>
    serverApi().getRecap((await params).id),
  );
}
