import { nanoid } from 'nanoid';
import type { BodyMark, RegionId } from '@/contracts/types';

export type MarkKind = BodyMark['kind'];

/**
 * Tapping an unmarked region adds a mark, tapping it again with the same
 * kind removes it, and tapping it with the other kind switches the kind.
 */
export function toggleRegion(
  marks: BodyMark[],
  regionId: RegionId,
  point: BodyMark['point'],
  kind: MarkKind,
  now: Date = new Date(),
): BodyMark[] {
  const existing = marks.find((m) => m.regionId === regionId);
  if (!existing) {
    return [
      ...marks,
      {
        id: nanoid(),
        regionId,
        point,
        kind,
        createdAt: now.toISOString(),
      },
    ];
  }
  if (existing.kind === kind) {
    return marks.filter((m) => m.regionId !== regionId);
  }
  return marks.map((m) =>
    m.regionId === regionId ? { ...m, kind, point } : m,
  );
}

export function setIntensity(
  marks: BodyMark[],
  id: string,
  value: number,
): BodyMark[] {
  const intensity = Math.min(10, Math.max(0, Math.round(value)));
  return marks.map((m) => (m.id === id ? { ...m, intensity } : m));
}

export function removeMark(marks: BodyMark[], id: string): BodyMark[] {
  return marks.filter((m) => m.id !== id);
}
