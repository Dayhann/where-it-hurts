'use client';

import { patientCopy } from '@/components/i18n/patient';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import type { Lang } from '@/contracts/types';
import { progressCount } from './progress';

export function QuestionProgress({
  progress,
  lang,
}: {
  progress?: Parameters<typeof progressCount>[0];
  lang: Lang;
}) {
  const copy = patientCopy(lang).chat;
  const count = progressCount(progress);
  if (!count) return <>{copy.progressFallback}</>;

  return (
    <>
      {copy.progressBefore}{' '}
      <AnimatedCounter value={count.asked} duration={0.35} />{' '}
      {copy.progressAfter(count.total)}
    </>
  );
}
