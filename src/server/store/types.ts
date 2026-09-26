import type { GetClinicQueueResponse } from '@/contracts/api';
import type { Session } from '@/contracts/types';

export type ClinicQueueItem = GetClinicQueueResponse['items'][number];

export interface SessionStore {
  create(session: Session): Promise<Session>;
  get(id: string): Promise<Session | null>;
  update(session: Session): Promise<Session>;
  listQueue(): Promise<ClinicQueueItem[]>;
}

export function toQueueItem(session: Session): ClinicQueueItem {
  return {
    sessionId: session.id,
    patientDisplayName: session.appointment.patientDisplayName,
    startsAt: session.appointment.startsAt,
    status: session.status,
    redFlag: session.redFlags.length > 0,
  };
}

export function orderQueue(items: ClinicQueueItem[]): ClinicQueueItem[] {
  return items.sort(
    (a, b) =>
      Number(b.redFlag) - Number(a.redFlag) ||
      a.startsAt.localeCompare(b.startsAt),
  );
}
