/**
 * Builds public/models/body.glb from the MakeHuman hm08 base mesh (CC0).
 *
 * Keeps the skin and eyeballs, recentres to feet-on-floor and scales to 1.7 m.
 * Splits the skin into one mesh per regionId from src/contracts/regions.ts
 * (plus a non-selectable "head"), using only the CC0 joint-marker groups in
 * base.obj. Also writes an "outlines" line mesh along region borders.
 *
 * Run: node scripts/build-body-glb.mjs [path/to/base.obj]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_URL =
  'https://raw.githubusercontent.com/makehumancommunity/makehuman/3c701a8e52f09e69922e8b598d23be2d7dfc49e3/makehuman/data/3dobjs/base.obj';
const SKIN_GROUP = 'body';
const EYE_GROUPS = new Set(['helper-l-eye', 'helper-r-eye']);
const TARGET_HEIGHT = 1.7;
const OUTLINE_OFFSET = 0.0015;

// Heights (metres) for the torso bands, measured on the scaled model.
const CHEST_MIN_Y = 1.17;
const ABDOMEN_MIN_Y = 0.94;
const UPPER_BACK_MIN_Y = 1.17;
const LOWER_BACK_MIN_Y = 0.97;
const HIP_LATERAL_X = 0.13;
const HIP_LATERAL_MIN_Y = 0.82;
const HIP_LATERAL_MAX_Y = 0.97;
const HEAD_MIN_Y = 1.5;
const JAW_MIN_Y = 1.455;
const JAW_FRONT_OFFSET = 0.05;
const NECK_MIN_Y = 1.4;
const NECK_RADIUS = 0.075;
const SMOOTHING_PASSES = 4;

// Joint-proximity radii (metres).
const SHOULDER_RADIUS = 0.08;
const ELBOW_RADIUS = 0.065;
const KNEE_RADIUS = 0.08;
const ANKLE_RADIUS = 0.06;

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
  const skinFaces = [];
  const eyeTris = [];
  const jointVerts = new Map();
  let group = '';
  for (const line of text.split('\n')) {
    if (line.startsWith('v ')) {
      const [, x, y, z] = line.trim().split(/\s+/);
      verts.push([Number(x), Number(y), Number(z)]);
    } else if (line.startsWith('g ')) {
      group = line.slice(2).trim();
    } else if (line.startsWith('f ')) {
      const idx = line
        .trim()
        .split(/\s+/)
        .slice(1)
        .map((t) => Number(t.split('/')[0]) - 1);
      if (group.startsWith('joint-')) {
        const set = jointVerts.get(group) ?? new Set();
        idx.forEach((i) => set.add(i));
        jointVerts.set(group, set);
        continue;
      }
      if (group === SKIN_GROUP) skinFaces.push(idx);
      else if (EYE_GROUPS.has(group)) eyeTris.push(...triangulate(idx));
    }
  }
  const joints = new Map();
  for (const [name, set] of jointVerts) {
    const c = [0, 0, 0];
    for (const i of set) for (let a = 0; a < 3; a += 1) c[a] += verts[i][a];
    joints.set(
      name,
      c.map((v) => v / set.size),
    );
  }
  return { verts, skinFaces, eyeTris, joints };
}

function triangulate(face) {
  const tris = [];
  for (let i = 1; i + 1 < face.length; i += 1) {
    tris.push([face[0], face[i], face[i + 1]]);
  }
  return tris;
}

function makeTransform(verts, tris) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const tri of tris) {
    for (const v of tri) {
      for (let a = 0; a < 3; a += 1) {
        min[a] = Math.min(min[a], verts[v][a]);
        max[a] = Math.max(max[a], verts[v][a]);
      }
    }
  }
  const scale = TARGET_HEIGHT / (max[1] - min[1]);
  const cx = (min[0] + max[0]) / 2;
  const cz = (min[2] + max[2]) / 2;
  return ([x, y, z]) => [
    (x - cx) * scale,
    (y - min[1]) * scale,
    (z - cz) * scale,
  ];
}

function smoothNormals(verts, tris) {
  const normals = verts.map(() => [0, 0, 0]);
  for (const [a, b, c] of tris) {
    const [ax, ay, az] = verts[a];
    const ux = verts[b][0] - ax;
    const uy = verts[b][1] - ay;
    const uz = verts[b][2] - az;
    const vx = verts[c][0] - ax;
    const vy = verts[c][1] - ay;
    const vz = verts[c][2] - az;
    const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    for (const v of [a, b, c]) {
      for (let k = 0; k < 3; k += 1) normals[v][k] += n[k];
    }
  }
  return normals.map((n) => {
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    return [n[0] / len, n[1] / len, n[2] / len];
  });
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function closestOnSegment(p, a, b) {
  const ab = sub(b, a);
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / dot(ab, ab)));
  const rawT = dot(sub(p, a), ab) / dot(ab, ab);
  return {
    t,
    rawT,
    point: [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t],
  };
}

function buildSkeleton(joint) {
  const segments = [
    {
      name: 'torso',
      side: 'mid',
      a: joint('pelvis'),
      b: joint('spine-4'),
      r: 0.14,
    },
    {
      name: 'torso',
      side: 'mid',
      a: joint('spine-4'),
      b: joint('spine-3'),
      r: 0.14,
    },
    {
      name: 'torso',
      side: 'mid',
      a: joint('spine-3'),
      b: joint('spine-2'),
      r: 0.14,
    },
    {
      name: 'torso',
      side: 'mid',
      a: joint('spine-2'),
      b: joint('spine-1'),
      r: 0.14,
    },
    {
      name: 'torso',
      side: 'mid',
      a: joint('spine-1'),
      b: joint('neck'),
      r: 0.1,
    },
    { name: 'neck', side: 'mid', a: joint('neck'), b: joint('head'), r: 0.06 },
    {
      name: 'head',
      side: 'mid',
      a: joint('head'),
      b: joint('head-2'),
      r: 0.09,
    },
  ];
  for (const [side, pre] of [
    ['left', 'l'],
    ['right', 'r'],
  ]) {
    const j = (n) => joint(`${pre}-${n}`);
    const wrist = j('hand');
    const forearmDir = sub(wrist, j('elbow'));
    const fingerTip = [
      wrist[0] + forearmDir[0] * 0.8,
      wrist[1] + forearmDir[1] * 0.8,
      wrist[2] + forearmDir[2] * 0.8,
    ];
    segments.push(
      { name: 'clavicle', side, a: j('clavicle'), b: j('shoulder'), r: 0.035 },
      { name: 'upper_arm', side, a: j('shoulder'), b: j('elbow'), r: 0.045 },
      { name: 'forearm', side, a: j('elbow'), b: wrist, r: 0.035 },
      { name: 'hand', side, a: wrist, b: fingerTip, r: 0.03 },
      { name: 'hip', side, a: joint('pelvis'), b: j('upper-leg'), r: 0.12 },
      { name: 'thigh', side, a: j('upper-leg'), b: j('knee'), r: 0.075 },
      { name: 'shin', side, a: j('knee'), b: j('ankle'), r: 0.05 },
      { name: 'foot', side, a: j('ankle'), b: j('foot-1'), r: 0.04 },
      { name: 'foot', side, a: j('foot-1'), b: j('foot-2'), r: 0.035 },
    );
  }
  return segments;
}

function torsoMidZ(verts, isTorso) {
  const bands = new Map();
  verts.forEach((p, i) => {
    if (!isTorso[i] || Math.abs(p[0]) > 0.1) return;
    const band = Math.round(p[1] / 0.02);
    const b = bands.get(band) ?? { min: Infinity, max: -Infinity };
    b.min = Math.min(b.min, p[2]);
    b.max = Math.max(b.max, p[2]);
    bands.set(band, b);
  });
  return (y) => {
    const band = Math.round(y / 0.02);
    for (let d = 0; d < 10; d += 1) {
      const b = bands.get(band + d) ?? bands.get(band - d);
      if (b) return (b.min + b.max) / 2;
    }
    return 0;
  };
}

function makeLabeller(verts, joint, skinVertices) {
  const segments = buildSkeleton(joint);
  const nearest = (p) => {
    const side = p[0] >= 0 ? 'left' : 'right';
    let best = null;
    for (const seg of segments) {
      if (seg.side !== 'mid' && seg.side !== side) continue;
      const hit = closestOnSegment(p, seg.a, seg.b);
      const score = dist(p, hit.point) - seg.r;
      if (!best || score < best.score) best = { seg, hit, score };
    }
    return { ...best, side };
  };

  const isTorso = new Array(verts.length).fill(false);
  for (const i of skinVertices) {
    const name = nearest(verts[i]).seg.name;
    isTorso[i] = name === 'torso' || name === 'hip';
  }
  const midZ = torsoMidZ(verts, isTorso);
  const j = (side, n) => joint(`${side === 'left' ? 'l' : 'r'}-${n}`);
  const neckAxis = joint('neck');

  return (p) => {
    const { seg, hit, side } = nearest(p);
    const near = (n, r) => dist(p, j(side, n)) < r;
    const midline = seg.side === 'mid';
    const nearNeckAxis =
      Math.hypot(p[0] - neckAxis[0], p[2] - neckAxis[2]) < NECK_RADIUS;
    const jaw = p[1] >= JAW_MIN_Y && p[2] > neckAxis[2] + JAW_FRONT_OFFSET;
    let label;
    const segName =
      midline && (p[1] >= HEAD_MIN_Y || jaw)
        ? 'head'
        : midline && p[1] >= NECK_MIN_Y && nearNeckAxis
          ? 'neck'
          : midline
            ? 'torso'
            : seg.name;
    switch (segName) {
      case 'head':
        label = 'head';
        break;
      case 'neck':
        label = 'neck';
        break;
      case 'clavicle':
        label = `shoulder_${side}`;
        break;
      case 'upper_arm':
        if (near('shoulder', SHOULDER_RADIUS)) label = `shoulder_${side}`;
        else if (near('elbow', ELBOW_RADIUS)) label = `elbow_${side}`;
        else label = `upper_arm_${side}`;
        break;
      case 'forearm':
        if (near('elbow', ELBOW_RADIUS)) label = `elbow_${side}`;
        else if (hit.rawT > 1) label = `wrist_hand_${side}`;
        else label = `forearm_${side}`;
        break;
      case 'hand':
        label = `wrist_hand_${side}`;
        break;
      case 'thigh':
        if (near('knee', KNEE_RADIUS)) label = `knee_${side}`;
        else
          label =
            p[2] >= hit.point[2] ? `thigh_front_${side}` : `thigh_back_${side}`;
        break;
      case 'shin':
        if (near('knee', KNEE_RADIUS)) label = `knee_${side}`;
        else if (near('ankle', ANKLE_RADIUS) || hit.rawT > 1)
          label = `ankle_foot_${side}`;
        else label = p[2] >= hit.point[2] ? `shin_${side}` : `calf_${side}`;
        break;
      case 'foot':
        label = `ankle_foot_${side}`;
        break;
      default: {
        const front = p[2] >= midZ(p[1]);
        const lateralHip =
          Math.abs(p[0]) > HIP_LATERAL_X &&
          p[1] > HIP_LATERAL_MIN_Y &&
          p[1] < HIP_LATERAL_MAX_Y;
        if (lateralHip) label = `hip_${side}`;
        else if (front) {
          if (p[1] >= CHEST_MIN_Y) label = `chest_${side}`;
          else if (p[1] >= ABDOMEN_MIN_Y) label = `abdomen_${side}`;
          else label = `hip_${side}`;
        } else if (p[1] >= UPPER_BACK_MIN_Y) label = `upper_back_${side}`;
        else if (p[1] >= LOWER_BACK_MIN_Y) label = `lower_back_${side}`;
        else label = `buttock_${side}`;
      }
    }
    return label;
  };
}

function centroid(verts, face) {
  const c = [0, 0, 0];
  for (const v of face) for (let a = 0; a < 3; a += 1) c[a] += verts[v][a];
  return c.map((x) => x / face.length);
}

/** Faces that disagree with most of their edge neighbours take the majority label. */
function smoothFaceLabels(faces, labels) {
  const edgeFaces = new Map();
  faces.forEach((face, f) => {
    face.forEach((a, k) => {
      const b = face[(k + 1) % face.length];
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      const list = edgeFaces.get(key) ?? [];
      list.push(f);
      edgeFaces.set(key, list);
    });
  });
  const neighbours = faces.map((face, f) => {
    const out = [];
    face.forEach((a, k) => {
      const b = face[(k + 1) % face.length];
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      for (const g of edgeFaces.get(key)) if (g !== f) out.push(g);
    });
    return out;
  });
  let current = labels;
  for (let pass = 0; pass < SMOOTHING_PASSES; pass += 1) {
    current = current.map((label, f) => {
      const counts = new Map();
      for (const g of neighbours[f]) {
        counts.set(current[g], (counts.get(current[g]) ?? 0) + 1);
      }
      const own = counts.get(label) ?? 0;
      let best = label;
      let bestCount = own;
      for (const [l, c] of counts) {
        if (c > bestCount) {
          best = l;
          bestCount = c;
        }
      }
      return bestCount > neighbours[f].length / 2 && own <= 1 ? best : label;
    });
  }
  return current;
}

function splitMeshes(verts, normals, skinTris, eyeTris, triRegion) {
  const groups = new Map();
  const add = (name, tri) => {
    const g = groups.get(name) ?? {
      remap: new Map(),
      pos: [],
      nrm: [],
      idx: [],
    };
    for (const v of tri) {
      if (!g.remap.has(v)) {
        g.remap.set(v, g.pos.length / 3);
        g.pos.push(...verts[v]);
        g.nrm.push(...normals[v]);
      }
      g.idx.push(g.remap.get(v));
    }
    groups.set(name, g);
  };
  skinTris.forEach((tri, i) => add(triRegion[i], tri));
  eyeTris.forEach((tri) => add('eyes', tri));
  return groups;
}

function outlineSegments(verts, normals, skinTris, triRegion) {
  const edges = new Map();
  skinTris.forEach((tri, t) => {
    for (let k = 0; k < 3; k += 1) {
      const a = tri[k];
      const b = tri[(k + 1) % 3];
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      const set = edges.get(key) ?? new Set();
      set.add(triRegion[t]);
      edges.set(key, set);
    }
  });
  const pos = [];
  for (const [key, regions] of edges) {
    if (regions.size < 2) continue;
    for (const v of key.split(',').map(Number)) {
      const p = verts[v];
      const n = normals[v];
      pos.push(
        p[0] + n[0] * OUTLINE_OFFSET,
        p[1] + n[1] * OUTLINE_OFFSET,
        p[2] + n[2] * OUTLINE_OFFSET,
      );
    }
  }
  return pos;
}

const pad4 = (n) => (4 - (n % 4)) % 4;

function boundsOf(pos) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) {
    for (let a = 0; a < 3; a += 1) {
      min[a] = Math.min(min[a], pos[i + a]);
      max[a] = Math.max(max[a], pos[i + a]);
    }
  }
  return { min, max };
}

function writeGlb(meshes) {
  const views = [];
  const accessors = [];
  const addView = (typed, accessor) => {
    views.push(typed);
    accessors.push({ ...accessor, bufferView: views.length - 1 });
    return accessors.length - 1;
  };

  const materials = [
    {
      name: 'Skin',
      pbrMetallicRoughness: {
        baseColorFactor: [0.72, 0.74, 0.76, 1],
        metallicFactor: 0,
        roughnessFactor: 0.8,
      },
    },
    {
      name: 'Outline',
      pbrMetallicRoughness: {
        baseColorFactor: [1, 1, 1, 1],
        metallicFactor: 0,
        roughnessFactor: 1,
      },
    },
  ];

  const gltfMeshes = meshes.map((m) => {
    const pos = new Float32Array(m.pos);
    const { min, max } = boundsOf(m.pos);
    const attributes = {
      POSITION: addView(pos, {
        componentType: 5126,
        count: pos.length / 3,
        type: 'VEC3',
        min,
        max,
      }),
    };
    if (m.nrm) {
      const nrm = new Float32Array(m.nrm);
      attributes.NORMAL = addView(nrm, {
        componentType: 5126,
        count: nrm.length / 3,
        type: 'VEC3',
      });
    }
    const primitive = { attributes, material: m.lines ? 1 : 0 };
    if (m.lines) primitive.mode = 1;
    if (m.idx) {
      const idx =
        pos.length / 3 > 65535
          ? new Uint32Array(m.idx)
          : new Uint16Array(m.idx);
      primitive.indices = addView(idx, {
        componentType: idx instanceof Uint32Array ? 5125 : 5123,
        count: idx.length,
        type: 'SCALAR',
      });
    }
    return { name: m.name, primitives: [primitive] };
  });

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

  const json = {
    asset: { version: '2.0', generator: 'where-it-hurts build-body-glb.mjs' },
    scene: 0,
    scenes: [{ nodes: meshes.map((_, i) => i) }],
    nodes: meshes.map((m, i) => ({ mesh: i, name: m.name })),
    meshes: gltfMeshes,
    materials,
    accessors,
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
const skinTris = [];
const faceOfTri = [];
parsed.skinFaces.forEach((face, f) => {
  for (const tri of triangulate(face)) {
    skinTris.push(tri);
    faceOfTri.push(f);
  }
});
const transform = makeTransform(parsed.verts, [...skinTris, ...parsed.eyeTris]);
const verts = parsed.verts.map(transform);
const joint = (name) => {
  const raw = parsed.joints.get(`joint-${name}`);
  if (!raw) throw new Error(`Missing joint-${name}`);
  return transform(raw);
};
const normals = smoothNormals(verts, [...skinTris, ...parsed.eyeTris]);
const skinVertices = new Set(skinTris.flat());
const labelPoint = makeLabeller(verts, joint, skinVertices);
const faceLabels = smoothFaceLabels(
  parsed.skinFaces,
  parsed.skinFaces.map((face) => labelPoint(centroid(verts, face))),
);
const triRegion = faceOfTri.map((f) => faceLabels[f]);
const groups = splitMeshes(verts, normals, skinTris, parsed.eyeTris, triRegion);
const outline = outlineSegments(verts, normals, skinTris, triRegion);

const meshes = [...groups.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, g]) => ({ name, pos: g.pos, nrm: g.nrm, idx: g.idx }));
meshes.push({ name: 'outlines', pos: outline, lines: true });

const glb = writeGlb(meshes);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, glb);
console.log(
  `Wrote ${outPath}: ${meshes.length} meshes, ${skinVertices.size} skin vertices, ${outline.length / 6} outline edges, ${(glb.length / 1024).toFixed(0)} KB`,
);
for (const m of meshes) {
  const tris = m.idx ? m.idx.length / 3 : 0;
  console.log(`  ${m.name.padEnd(20)} ${String(tris).padStart(6)} tris`);
}
