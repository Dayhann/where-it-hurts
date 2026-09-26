export function progressLabel(progress?: {
  asked: number;
  estimatedTotal: number;
}): string {
  const asked = progress?.asked ?? 0;
  const total = Math.max(progress?.estimatedTotal ?? 7, 1);
  if (asked <= 0) return 'A few questions';
  return `Question ${asked} of about ${total}`;
}
