import type { PatientRecapLine } from '@/contracts/types';

export function recapEdits(lines: PatientRecapLine[]) {
  return lines.map(({ slot, text }) => ({ slot, text }));
}
