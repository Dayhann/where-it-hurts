import type { AssistantTurn } from '@/contracts/types';

export function checkinStep({
  chatStarted,
  turn,
  confirmed = false,
}: {
  chatStarted: boolean;
  turn: AssistantTurn | null;
  confirmed?: boolean;
}): number {
  if (turn?.type === 'done') return confirmed ? 3 : 2;
  return chatStarted ? 1 : 0;
}
