import { nanoid } from 'nanoid';
import { REGIONS } from '@/contracts/regions';
import type { BodyMark, RegionId } from '@/contracts/types';

export type MarkKind = BodyMark['kind'];

function dist2(a: BodyMark['point'], b: BodyMark['point']): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

/** Nearest region whose contract anchor is set. Returns null until A-03 calibration fills them. */
export function nearestAnchor(point: BodyMark['point']): RegionId | null {
  let best: RegionId | null = null;
  let bestDist = Infinity;
  for (const region of REGIONS) {
    if (!region.anchor) continue;
    const d = dist2(region.anchor, point);
    if (d < bestDist) {
      bestDist = d;
      best = region.id;
    }
  }
  return best;
}

/** Prefer the named mesh; fall back to the nearest filled anchor. */
export function regionIdFromHit(
  meshName: string | null,
  point: BodyMark['point'],
): RegionId | null {
  if (meshName && REGIONS.some((r) => r.id === meshName)) return meshName;
  return nearestAnchor(point);
}

/** Closest pain mark to a spread point, used to draw the dashed line. */
export function nearestPain(
  marks: BodyMark[],
  point: BodyMark['point'],
): BodyMark | undefined {
  let best: BodyMark | undefined;
  let bestDist = Infinity;
  for (const mark of marks) {
    if (mark.kind !== 'pain') continue;
    const d = dist2(mark.point, point);
    if (d < bestDist) {
      bestDist = d;
      best = mark;
    }
  }
  return best;
}

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
