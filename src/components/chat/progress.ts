import { patientCopy } from '@/components/i18n/patient';
import type { Lang } from '@/contracts/types';

type Progress = {
  asked: number;
  estimatedTotal: number;
};

export function progressCount(progress?: Progress) {
  const asked = progress?.asked ?? 0;
  const total = Math.max(progress?.estimatedTotal ?? 7, 1);
  return asked > 0 ? { asked, total } : null;
}

export function progressLabel(progress?: Progress, lang: Lang = 'en'): string {
  const copy = patientCopy(lang).chat;
  const count = progressCount(progress);
  if (!count) return copy.progressFallback;
  return copy.progress(count.asked, count.total);
}
