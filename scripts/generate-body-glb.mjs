/**
 * Writes a low-poly A-pose mannequin to public/models/body.glb.
 * Author-owned geometry, CC0. Placeholder until a MakeHuman export lands.
 *
 * Run: node scripts/generate-body-glb.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'public', 'models', 'body.glb');

const positions = [];
const normals = [];
const indices = [];

function rotateZ(x, y, z, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c - y * s, x * s + y * c, z];
}

function rotateY(x, y, z, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c + z * s, y, -x * s + z * c];
}

function addBox(cx, cy, cz, sx, sy, sz, rz = 0, ry = 0) {
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  const local = [
    [-hx, -hy, hz],
    [hx, -hy, hz],
    [hx, hy, hz],
    [-hx, hy, hz],
    [-hx, -hy, -hz],
    [hx, -hy, -hz],
    [hx, hy, -hz],
    [-hx, hy, -hz],
  ];
  const world = local.map(([x, y, z]) => {
    let p = rotateZ(x, y, z, rz);
    p = rotateY(p[0], p[1], p[2], ry);
    return [p[0] + cx, p[1] + cy, p[2] + cz];
  });
  const faces = [
    [0, 1, 2, 3],
    [5, 4, 7, 6],
    [4, 0, 3, 7],
    [1, 5, 6, 2],
    [3, 2, 6, 7],
    [4, 5, 1, 0],
  ];
  for (const [a, b, c, d] of faces) {
    const p0 = world[a];
    const p1 = world[b];
    const p2 = world[c];
    const ux = p1[0] - p0[0];
    const uy = p1[1] - p0[1];
    const uz = p1[2] - p0[2];
    const vx = p2[0] - p0[0];
    const vy = p2[1] - p0[1];
    const vz = p2[2] - p0[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    const base = positions.length / 3;
    for (const i of [a, b, c, d]) {
      positions.push(...world[i]);
      normals.push(nx, ny, nz);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}

// Metres, Y-up, facing +Z. Patient left = -X.
addBox(0, 1.58, 0, 0.18, 0.22, 0.2); // head
addBox(0, 1.42, 0, 0.1, 0.1, 0.1); // neck
addBox(0, 1.18, 0, 0.32, 0.46, 0.16); // torso
addBox(0, 0.9, 0, 0.28, 0.16, 0.14); // pelvis
const armOut = 0.55;
addBox(-0.28, 1.22, 0, 0.08, 0.32, 0.08, armOut);
addBox(0.28, 1.22, 0, 0.08, 0.32, 0.08, -armOut);
addBox(-0.42, 0.96, 0, 0.07, 0.28, 0.07, armOut);
addBox(0.42, 0.96, 0, 0.07, 0.28, 0.07, -armOut);
addBox(-0.52, 0.76, 0, 0.08, 0.1, 0.05, armOut);
addBox(0.52, 0.76, 0, 0.08, 0.1, 0.05, -armOut);
addBox(-0.1, 0.62, 0, 0.12, 0.42, 0.12);
addBox(0.1, 0.62, 0, 0.12, 0.42, 0.12);
addBox(-0.1, 0.24, 0, 0.1, 0.36, 0.1);
addBox(0.1, 0.24, 0, 0.1, 0.36, 0.1);
addBox(-0.1, 0.04, 0.04, 0.11, 0.06, 0.2);
addBox(0.1, 0.04, 0.04, 0.11, 0.06, 0.2);

const posBytes = new Float32Array(positions).buffer;
const nrmBytes = new Float32Array(normals).buffer;
const idxArray =
  indices.length > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);
const idxBytes = idxArray.buffer;

function pad4(n) {
  return (4 - (n % 4)) % 4;
}

const posOffset = 0;
const nrmOffset = posBytes.byteLength;
const idxOffset = nrmOffset + nrmBytes.byteLength;
const binPad = pad4(idxOffset + idxBytes.byteLength);
const binLength = idxOffset + idxBytes.byteLength + binPad;
const bin = new Uint8Array(binLength);
bin.set(new Uint8Array(posBytes), posOffset);
bin.set(new Uint8Array(nrmBytes), nrmOffset);
bin.set(new Uint8Array(idxBytes), idxOffset);

const componentType = idxArray instanceof Uint32Array ? 5125 : 5123;
const json = {
  asset: {
    version: '2.0',
    generator: 'where-it-hurts scripts/generate-body-glb.mjs',
  },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: 'Body' }],
  meshes: [
    {
      name: 'Body',
      primitives: [
        {
          attributes: { POSITION: 0, NORMAL: 1 },
          indices: 2,
          material: 0,
        },
      ],
    },
  ],
  materials: [
    {
      name: 'Neutral',
      pbrMetallicRoughness: {
        baseColorFactor: [0.62, 0.64, 0.66, 1],
        metallicFactor: 0,
        roughnessFactor: 0.75,
      },
    },
  ],
  accessors: [
    {
      bufferView: 0,
      componentType: 5126,
      count: positions.length / 3,
      type: 'VEC3',
      min: [
        Math.min(...positions.filter((_, i) => i % 3 === 0)),
        Math.min(...positions.filter((_, i) => i % 3 === 1)),
        Math.min(...positions.filter((_, i) => i % 3 === 2)),
      ],
      max: [
        Math.max(...positions.filter((_, i) => i % 3 === 0)),
        Math.max(...positions.filter((_, i) => i % 3 === 1)),
        Math.max(...positions.filter((_, i) => i % 3 === 2)),
      ],
    },
    {
      bufferView: 1,
      componentType: 5126,
      count: normals.length / 3,
      type: 'VEC3',
    },
    {
      bufferView: 2,
      componentType,
      count: indices.length,
      type: 'SCALAR',
    },
  ],
  bufferViews: [
    { buffer: 0, byteOffset: posOffset, byteLength: posBytes.byteLength },
    { buffer: 0, byteOffset: nrmOffset, byteLength: nrmBytes.byteLength },
    { buffer: 0, byteOffset: idxOffset, byteLength: idxBytes.byteLength },
  ],
  buffers: [{ byteLength: binLength }],
};

const jsonText = JSON.stringify(json);
const jsonPad = pad4(jsonText.length);
const jsonChunk = jsonText.length + jsonPad;
const total = 12 + 8 + jsonChunk + 8 + bin.length;

const glb = Buffer.alloc(total);
let o = 0;
glb.writeUInt32LE(0x46546c67, o);
o += 4;
glb.writeUInt32LE(2, o);
o += 4;
glb.writeUInt32LE(total, o);
o += 4;
glb.writeUInt32LE(jsonChunk, o);
o += 4;
glb.writeUInt32LE(0x4e4f534a, o);
o += 4;
glb.write(jsonText, o);
o += jsonText.length;
for (let i = 0; i < jsonPad; i += 1) glb[o++] = 0x20;
glb.writeUInt32LE(bin.length, o);
o += 4;
glb.writeUInt32LE(0x004e4942, o);
o += 4;
Buffer.from(bin).copy(glb, o);

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, glb);
console.log(
  `Wrote ${outPath} (${glb.length} bytes, ${indices.length / 3} triangles)`,
);
