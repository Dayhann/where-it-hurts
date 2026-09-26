import type { GetClinicQueueResponse } from '@/contracts/api';

export type QueueItem = GetClinicQueueResponse['items'][number];

export function sortReceptionQueue(items: QueueItem[]): QueueItem[] {
  return [...items].sort((a, b) => {
    const alertOrder = Number(b.redFlag) - Number(a.redFlag);
    return alertOrder || a.startsAt.localeCompare(b.startsAt);
  });
}

export function queueChanges(
  previous: QueueItem[] | null,
  next: QueueItem[],
): { arrived: QueueItem[]; flagged: QueueItem[] } {
  if (!previous) return { arrived: [], flagged: [] };
  const before = new Map(previous.map((item) => [item.sessionId, item]));
  return {
    arrived: next.filter((item) => !before.has(item.sessionId)),
    flagged: next.filter(
      (item) => item.redFlag && !before.get(item.sessionId)?.redFlag,
    ),
  };
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
