import { describe, expect, it } from 'vitest';
import type { BodyMark } from '@/contracts/types';
import { removeMark, setIntensity, toggleRegion } from './marks';

const now = new Date('2026-09-26T07:00:00.000Z');
const point: BodyMark['point'] = [0.1, 1.0, -0.1];

describe('toggleRegion', () => {
  it('adds a mark for an unmarked region', () => {
    const marks = toggleRegion([], 'lower_back_left', point, 'pain', now);
    expect(marks).toHaveLength(1);
    expect(marks[0]).toMatchObject({
      regionId: 'lower_back_left',
      kind: 'pain',
      point,
      createdAt: now.toISOString(),
    });
    expect(marks[0].id).toBeTruthy();
  });

  it('removes the mark when the same region is tapped with the same kind', () => {
    const once = toggleRegion([], 'knee_right', point, 'pain', now);
    expect(toggleRegion(once, 'knee_right', point, 'pain', now)).toEqual([]);
  });

  it('switches the kind when tapped with the other kind', () => {
    const once = toggleRegion([], 'calf_left', point, 'pain', now);
    const switched = toggleRegion(once, 'calf_left', point, 'spread', now);
    expect(switched).toHaveLength(1);
    expect(switched[0].kind).toBe('spread');
    expect(switched[0].id).toBe(once[0].id);
  });

  it('keeps other regions untouched', () => {
    const a = toggleRegion([], 'neck', point, 'pain', now);
    const b = toggleRegion(a, 'shoulder_left', point, 'spread', now);
    expect(b.map((m) => m.regionId)).toEqual(['neck', 'shoulder_left']);
  });
});

describe('setIntensity', () => {
  const [mark] = toggleRegion([], 'hip_left', point, 'pain', now);

  it('sets a whole-number intensity', () => {
    expect(setIntensity([mark], mark.id, 6.4)[0].intensity).toBe(6);
  });

  it('clamps to 0-10', () => {
    expect(setIntensity([mark], mark.id, 14)[0].intensity).toBe(10);
    expect(setIntensity([mark], mark.id, -3)[0].intensity).toBe(0);
  });
});

describe('removeMark', () => {
  it('removes only the given mark', () => {
    const a = toggleRegion([], 'neck', point, 'pain', now);
    const b = toggleRegion(a, 'chest_left', point, 'pain', now);
    expect(removeMark(b, a[0].id).map((m) => m.regionId)).toEqual([
      'chest_left',
    ]);
  });
});
