import type { GetClinicQueueResponse } from '@/contracts/api';

export type QueueItem = GetClinicQueueResponse['items'][number];

export function sortReceptionQueue(items: QueueItem[]): QueueItem[] {
  return [...items].sort((a, b) => {
    const alertOrder = Number(b.redFlag) - Number(a.redFlag);
    return alertOrder || a.startsAt.localeCompare(b.startsAt);
  });
}

export function queueStatus(status: QueueItem['status']): string {
  switch (status) {
    case 'in_progress':
      return 'In progress';
    case 'redflag_stopped':
      return 'Needs attention';
    case 'awaiting_confirm':
      return 'Reviewing answers';
    case 'confirmed':
      return 'Ready';
  }
}
