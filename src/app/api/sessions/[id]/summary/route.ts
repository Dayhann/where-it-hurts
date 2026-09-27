import { GetSummaryResponseSchema } from '@/contracts/api';
import { respond, serverApi } from '@/server/api/http';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return respond(GetSummaryResponseSchema, async () =>
    serverApi().getSummary((await params).id),
  );
}
