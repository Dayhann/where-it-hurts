import { GetClinicQueueResponseSchema } from '@/contracts/api';
import { respond, serverApi } from '@/server/api/http';

export async function GET() {
  return respond(GetClinicQueueResponseSchema, async () =>
    serverApi().getClinicQueue(),
  );
}
