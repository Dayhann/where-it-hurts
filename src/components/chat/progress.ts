import { patientCopy } from '@/components/i18n/patient';
import type { Lang } from '@/contracts/types';

export function progressLabel(
  progress?: {
    asked: number;
    estimatedTotal: number;
  },
  lang: Lang = 'en',
): string {
  const copy = patientCopy(lang).chat;
  const asked = progress?.asked ?? 0;
  const total = Math.max(progress?.estimatedTotal ?? 7, 1);
  if (asked <= 0) return copy.progressFallback;
  return copy.progress(asked, total);
}
