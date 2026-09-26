import type { ClinicianSummary } from '@/contracts/types';

export function summaryText(summary: ClinicianSummary): string {
  return [
    ...summary.headline,
    ...summary.lines
      .filter((line) => !summary.headline.includes(line.text))
      .map((line) => line.text),
  ].join('\n');
}
