import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REGIONS } from '@/contracts/regions';

const NON_SELECTABLE = ['head', 'eyes', 'outlines'];

function readGlbJson(path: string): { meshes: { name: string }[] } {
  const buf = readFileSync(path);
  expect(buf.readUInt32LE(0)).toBe(0x46546c67);
  const jsonLength = buf.readUInt32LE(12);
  expect(buf.readUInt32LE(16)).toBe(0x4e4f534a);
  return JSON.parse(buf.subarray(20, 20 + jsonLength).toString('utf8'));
}

describe('public/models/body.glb', () => {
  const gltf = readGlbJson(join(process.cwd(), 'public', 'models', 'body.glb'));
  const names = gltf.meshes.map((m) => m.name);

  it('has a mesh for every contract region', () => {
    for (const region of REGIONS) {
      expect(names).toContain(region.id);
    }
  });

  it('has no meshes other than the regions, head, eyes and outlines', () => {
    const allowed = new Set([...REGIONS.map((r) => r.id), ...NON_SELECTABLE]);
    expect(names.filter((n) => !allowed.has(n))).toEqual([]);
    for (const n of NON_SELECTABLE) expect(names).toContain(n);
  });
});
