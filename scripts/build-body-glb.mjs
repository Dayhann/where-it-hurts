/**
 * Builds public/models/body.glb from the MakeHuman hm08 base mesh (CC0).
 *
 * Keeps the skin ("body") and eyeballs, drops joint/clothing/teeth helpers,
 * triangulates, recentres to feet-on-floor, scales to 1.7 m and writes
 * smooth normals.
 *
 * Run: node scripts/build-body-glb.mjs [path/to/base.obj]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_URL =
  'https://raw.githubusercontent.com/makehumancommunity/makehuman/3c701a8e52f09e69922e8b598d23be2d7dfc49e3/makehuman/data/3dobjs/base.obj';
const KEEP_GROUPS = new Set(['body', 'helper-l-eye', 'helper-r-eye']);
const TARGET_HEIGHT = 1.7;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'public', 'models', 'body.glb');

async function loadObj() {
  const local = process.argv[2];
  if (local) return readFileSync(local, 'utf8');
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return res.text();
}

function parse(text) {
  const verts = [];
  const tris = [];
  let group = '';
  for (const line of text.split('\n')) {
    if (line.startsWith('v ')) {
      const [, x, y, z] = line.trim().split(/\s+/);
      verts.push([Number(x), Number(y), Number(z)]);
    } else if (line.startsWith('g ')) {
      group = line.slice(2).trim();
    } else if (line.startsWith('f ') && KEEP_GROUPS.has(group)) {
      const idx = line
        .trim()
        .split(/\s+/)
        .slice(1)
        .map((t) => Number(t.split('/')[0]) - 1);
      for (let i = 1; i + 1 < idx.length; i += 1) {
        tris.push([idx[0], idx[i], idx[i + 1]]);
      }
    }
  }
  return { verts, tris };
}

function compact({ verts, tris }) {
  const remap = new Map();
  const positions = [];
  const indices = [];
  for (const tri of tris) {
    for (const v of tri) {
      if (!remap.has(v)) {
        remap.set(v, positions.length / 3);
        positions.push(...verts[v]);
      }
      indices.push(remap.get(v));
    }
  }
  return { positions, indices };
}

function normalise(positions) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let a = 0; a < 3; a += 1) {
      min[a] = Math.min(min[a], positions[i + a]);
      max[a] = Math.max(max[a], positions[i + a]);
    }
  }
  const scale = TARGET_HEIGHT / (max[1] - min[1]);
  const cx = (min[0] + max[0]) / 2;
  const cz = (min[2] + max[2]) / 2;
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = (positions[i] - cx) * scale;
    positions[i + 1] = (positions[i + 1] - min[1]) * scale;
    positions[i + 2] = (positions[i + 2] - cz) * scale;
  }
}

function smoothNormals(positions, indices) {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [indices[i], indices[i + 1], indices[i + 2]];
    const ax = positions[a * 3];
    const ay = positions[a * 3 + 1];
    const az = positions[a * 3 + 2];
    const ux = positions[b * 3] - ax;
    const uy = positions[b * 3 + 1] - ay;
    const uz = positions[b * 3 + 2] - az;
    const vx = positions[c * 3] - ax;
    const vy = positions[c * 3 + 1] - ay;
    const vz = positions[c * 3 + 2] - az;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const v of [a, b, c]) {
      normals[v * 3] += nx;
      normals[v * 3 + 1] += ny;
      normals[v * 3 + 2] += nz;
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= len;
    normals[i + 1] /= len;
    normals[i + 2] /= len;
  }
  return normals;
}

function bounds(positions) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let a = 0; a < 3; a += 1) {
      min[a] = Math.min(min[a], positions[i + a]);
      max[a] = Math.max(max[a], positions[i + a]);
    }
  }
  return { min, max };
}

const pad4 = (n) => (4 - (n % 4)) % 4;

function writeGlb(positions, normals, indices) {
  const pos = new Float32Array(positions);
  const idx =
    pos.length / 3 > 65535
      ? new Uint32Array(indices)
      : new Uint16Array(indices);
  const views = [pos, normals, idx];
  const offsets = [];
  let length = 0;
  for (const view of views) {
    offsets.push(length);
    length += view.byteLength + pad4(view.byteLength);
  }
  const bin = Buffer.alloc(length);
  views.forEach((view, i) =>
    Buffer.from(view.buffer, view.byteOffset, view.byteLength).copy(
      bin,
      offsets[i],
    ),
  );

  const { min, max } = bounds(positions);
  const json = {
    asset: { version: '2.0', generator: 'where-it-hurts build-body-glb.mjs' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'Body' }],
    meshes: [
      {
        name: 'Body',
        primitives: [
          { attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 },
        ],
      },
    ],
    materials: [
      {
        name: 'Neutral',
        pbrMetallicRoughness: {
          baseColorFactor: [0.72, 0.74, 0.76, 1],
          metallicFactor: 0,
          roughnessFactor: 0.8,
        },
      },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: pos.length / 3,
        type: 'VEC3',
        min,
        max,
      },
      {
        bufferView: 1,
        componentType: 5126,
        count: normals.length / 3,
        type: 'VEC3',
      },
      {
        bufferView: 2,
        componentType: idx instanceof Uint32Array ? 5125 : 5123,
        count: idx.length,
        type: 'SCALAR',
      },
    ],
    bufferViews: views.map((view, i) => ({
      buffer: 0,
      byteOffset: offsets[i],
      byteLength: view.byteLength,
    })),
    buffers: [{ byteLength: length }],
  };

  const jsonBuf = Buffer.from(JSON.stringify(json));
  const jsonPadded = Buffer.concat([
    jsonBuf,
    Buffer.alloc(pad4(jsonBuf.length), 0x20),
  ]);
  const header = Buffer.alloc(12);
  const total = 12 + 8 + jsonPadded.length + 8 + bin.length;
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(total, 8);
  const chunk = (type, data) => {
    const head = Buffer.alloc(8);
    head.writeUInt32LE(data.length, 0);
    head.writeUInt32LE(type, 4);
    return Buffer.concat([head, data]);
  };
  return Buffer.concat([
    header,
    chunk(0x4e4f534a, jsonPadded),
    chunk(0x004e4942, bin),
  ]);
}

const parsed = parse(await loadObj());
const { positions, indices } = compact(parsed);
normalise(positions);
const normals = smoothNormals(positions, indices);
const glb = writeGlb(positions, normals, indices);

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, glb);
console.log(
  `Wrote ${outPath}: ${positions.length / 3} vertices, ${indices.length / 3} triangles, ${(glb.length / 1024).toFixed(0)} KB`,
);
