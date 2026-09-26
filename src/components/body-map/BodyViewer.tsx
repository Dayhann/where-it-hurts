'use client';

import { Line, OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { REGION_BY_ID, REGIONS } from '@/contracts/regions';
import type { BodyMark } from '@/contracts/types';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  nearestPain,
  regionIdFromHit,
  removeMark,
  setIntensity,
  toggleRegion,
  type MarkKind,
} from './marks';

const MODEL_URL = '/models/body.glb';
const HEIGHT = 0.88;
const TARGET: [number, number, number] = [0, HEIGHT, 0];
const TAP_MAX_DRAG_PX = 6;

// The model faces +Z with the patient's left at +X, so a camera at +X
// (azimuth +90°) looks at the patient's left side.
const PRESETS = {
  front: { azimuth: 0, label: 'Front' },
  back: { azimuth: Math.PI, label: 'Back' },
  left: { azimuth: Math.PI / 2, label: 'Your left side' },
  right: { azimuth: -Math.PI / 2, label: 'Your right side' },
} as const;

type Preset = keyof typeof PRESETS;

const COLORS = {
  skin: '#b9bec4',
  hover: '#d3d7db',
  eyes: '#7f868d',
  outline: '#f7f5f0',
  pain: '#e5566f',
  spread: '#f29a3a',
} as const;

const KIND_LABEL: Record<MarkKind, string> = {
  pain: 'Where it hurts',
  spread: 'Where it spreads',
};

const DEBUG_COLORS = new Map(
  REGIONS.map((r, i) => [
    r.id,
    new THREE.Color().setHSL((i * 0.618) % 1, 0.65, 0.55),
  ]),
);

function shortestAngle(from: number, to: number) {
  return from + Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function BodyModel({
  marks,
  hovered,
  debug,
  onHover,
  onTap,
}: {
  marks: BodyMark[];
  hovered: string | null;
  debug: boolean;
  onHover: (regionId: string | null) => void;
  onTap: (regionId: string | null, point: BodyMark['point']) => void;
}) {
  const { scene } = useGLTF(MODEL_URL);

  const { root, materials } = useMemo(() => {
    const next = scene.clone(true);
    const byName = new Map<string, THREE.MeshStandardMaterial>();
    next.traverse((obj) => {
      if (obj instanceof THREE.LineSegments) {
        obj.material = new THREE.LineBasicMaterial({
          color: COLORS.outline,
          transparent: true,
          opacity: 0.9,
        });
        obj.raycast = () => {};
      } else if (obj instanceof THREE.Mesh) {
        const material = new THREE.MeshStandardMaterial({
          color: obj.name === 'eyes' ? COLORS.eyes : COLORS.skin,
          roughness: 0.7,
          metalness: 0.02,
        });
        obj.material = material;
        byName.set(obj.name, material);
      }
    });
    return { root: next, materials: byName };
  }, [scene]);

  useEffect(() => {
    const kindByRegion = new Map(marks.map((m) => [m.regionId, m.kind]));
    for (const [name, material] of materials) {
      if (!REGION_BY_ID[name]) continue;
      const kind = kindByRegion.get(name);
      const color = debug
        ? DEBUG_COLORS.get(name)!
        : kind
          ? COLORS[kind]
          : name === hovered
            ? COLORS.hover
            : COLORS.skin;
      material.color.set(color);
    }
  }, [materials, marks, hovered, debug]);

  const regionOf = (e: ThreeEvent<PointerEvent | MouseEvent>) =>
    regionIdFromHit(e.object.name, e.point.toArray() as BodyMark['point']);

  return (
    <primitive
      object={root}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.delta > TAP_MAX_DRAG_PX) return;
        onTap(regionOf(e), e.point.toArray() as BodyMark['point']);
      }}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onHover(regionOf(e));
      }}
      onPointerOut={() => onHover(null)}
    />
  );
}

function PresetRig({
  azimuth,
  lock,
  controls,
}: {
  azimuth: number;
  lock: boolean;
  controls: RefObject<OrbitControlsImpl | null>;
}) {
  useFrame((_, delta) => {
    if (!lock) return;
    const orbit = controls.current;
    if (!orbit) return;
    const current = orbit.getAzimuthalAngle();
    const target = shortestAngle(current, azimuth);
    const next = THREE.MathUtils.damp(current, target, 8, delta);
    orbit.setAzimuthalAngle(next);
    orbit.update();
  });
  return null;
}

function MarkVisuals({ marks }: { marks: BodyMark[] }) {
  return (
    <>
      {marks.map((mark) => (
        <mesh key={mark.id} position={mark.point} raycast={() => {}}>
          <sphereGeometry args={[0.018, 16, 16]} />
          <meshStandardMaterial color={COLORS[mark.kind]} roughness={0.4} />
        </mesh>
      ))}
      {marks
        .filter((mark) => mark.kind === 'spread')
        .map((spread) => {
          const pain = nearestPain(marks, spread.point);
          if (!pain) return null;
          return (
            <Line
              key={`spread-${spread.id}`}
              points={[pain.point, spread.point]}
              color={COLORS.spread}
              dashed
              dashSize={0.03}
              gapSize={0.02}
              lineWidth={2}
              raycast={() => {}}
            />
          );
        })}
    </>
  );
}

type BodyViewerProps = {
  marks: BodyMark[];
  onChange: (marks: BodyMark[]) => void;
};

export default function BodyViewer({ marks, onChange }: BodyViewerProps) {
  const controls = useRef<OrbitControlsImpl>(null);
  const dragStartAzimuth = useRef(0);
  const [preset, setPreset] = useState<Preset>('front');
  const [lock, setLock] = useState(true);
  const [kind, setKind] = useState<MarkKind>('pain');
  const [hovered, setHovered] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [past, setPast] = useState<BodyMark[][]>([]);
  const params = useSearchParams();
  const debug = params.get('regions') === '1';
  const calibrate = params.get('calibrate') === '1';

  const selected = marks.find((m) => m.id === selectedId) ?? null;
  const hoveredLabel = hovered ? REGION_BY_ID[hovered]?.label.en : null;

  const commit = (next: BodyMark[]) => {
    setPast((prev) => [...prev, marks]);
    onChange(next);
  };

  const undo = () => {
    const previous = past.at(-1);
    if (!previous) return;
    setPast((prev) => prev.slice(0, -1));
    setSelectedId(null);
    onChange(previous);
  };

  const handleTap = (regionId: string | null, point: BodyMark['point']) => {
    if (calibrate) {
      console.log({ point });
    }
    if (!regionId) return;
    const next = toggleRegion(marks, regionId, point, kind);
    const mark = next.find((m) => m.regionId === regionId);
    setSelectedId(mark?.id ?? null);
    commit(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className="grid grid-cols-2 gap-2"
        role="group"
        aria-label="What are you marking?"
      >
        {(Object.keys(KIND_LABEL) as MarkKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className={cn(
              buttonVariants({
                variant: kind === k ? 'default' : 'outline',
                size: 'touch',
              }),
              'justify-start',
            )}
          >
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[k] }}
            />
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
        <div
          className={cn(
            'h-[min(56vh,28rem)] w-full',
            hovered && 'cursor-pointer',
          )}
        >
          <Canvas
            camera={{ position: [0, HEIGHT, 2.9], fov: 35 }}
            gl={{ preserveDrawingBuffer: true, antialias: true }}
            dpr={[1, 1.5]}
          >
            <color attach="background" args={['#f3efe6']} />
            <hemisphereLight args={['#f7f3ea', '#b7c0c7', 1.15]} />
            <directionalLight position={[2.2, 4, 2.5]} intensity={1.15} />
            <directionalLight position={[-2, 1.5, -1.5]} intensity={0.35} />
            <Suspense fallback={null}>
              <BodyModel
                marks={marks}
                hovered={hovered}
                debug={debug}
                onHover={setHovered}
                onTap={handleTap}
              />
              <MarkVisuals marks={marks} />
            </Suspense>
            <PresetRig
              azimuth={PRESETS[preset].azimuth}
              lock={lock}
              controls={controls}
            />
            <OrbitControls
              ref={controls}
              target={TARGET}
              enablePan={false}
              enableDamping
              minPolarAngle={Math.PI / 2}
              maxPolarAngle={Math.PI / 2}
              minDistance={2.4}
              maxDistance={4.5}
              onStart={() => {
                dragStartAzimuth.current =
                  controls.current?.getAzimuthalAngle() ?? 0;
              }}
              onEnd={() => {
                const now = controls.current?.getAzimuthalAngle() ?? 0;
                if (Math.abs(now - dragStartAzimuth.current) > 0.02) {
                  setLock(false);
                }
              }}
            />
          </Canvas>
        </div>
        {hoveredLabel && (
          <p className="pointer-events-none absolute top-2 left-2 rounded-md bg-background/90 px-2 py-1 text-base shadow-sm">
            {hoveredLabel}
          </p>
        )}
        {calibrate && (
          <p className="absolute right-2 bottom-2 rounded-md bg-background/90 px-2 py-1 text-base shadow-sm">
            Calibration on — taps log the point to the console.
          </p>
        )}
      </div>

      <div className="grid w-full grid-cols-2 gap-2">
        {(Object.keys(PRESETS) as Preset[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setPreset(key);
              setLock(true);
            }}
            aria-pressed={lock && preset === key}
            className={cn(
              buttonVariants({
                variant: lock && preset === key ? 'default' : 'outline',
                size: 'touch',
              }),
            )}
          >
            {PRESETS[key].label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={undo}
          disabled={past.length === 0}
          className={cn(buttonVariants({ variant: 'outline', size: 'touch' }))}
        >
          Undo last change
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedId(null);
            commit([]);
          }}
          disabled={marks.length === 0}
          className={cn(buttonVariants({ variant: 'outline', size: 'touch' }))}
        >
          Clear all marks
        </button>
      </div>

      <section aria-label="Places you marked" className="flex flex-col gap-3">
        {marks.length === 0 ? (
          <p className="text-muted-foreground">
            Nothing marked yet. Tap the body where it hurts.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {marks.map((m) => {
              const label = REGION_BY_ID[m.regionId]?.label.en ?? m.regionId;
              const isSelected = m.id === selectedId;
              return (
                <li
                  key={m.id}
                  className={cn(
                    'flex h-11 items-center overflow-hidden rounded-full border bg-background text-base',
                    isSelected
                      ? 'border-ring ring-2 ring-ring/40'
                      : 'border-border',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(isSelected ? null : m.id)}
                    aria-pressed={isSelected}
                    className="flex h-full items-center gap-2 pr-1 pl-3 outline-none focus-visible:bg-muted"
                  >
                    <span
                      aria-hidden
                      className="size-3 rounded-full"
                      style={{ backgroundColor: COLORS[m.kind] }}
                    />
                    {label}
                    {m.intensity !== undefined && (
                      <span className="text-muted-foreground">
                        {m.intensity}/10
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isSelected) setSelectedId(null);
                      commit(removeMark(marks, m.id));
                    }}
                    aria-label={`Remove ${label}`}
                    className="flex size-11 items-center justify-center text-muted-foreground outline-none hover:text-foreground focus-visible:bg-muted"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {selected && (
          <label className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3">
            <span>
              {REGION_BY_ID[selected.regionId]?.label.en}: how bad is it?{' '}
              {selected.intensity === undefined ? (
                <span className="text-muted-foreground">
                  Move the slider to choose.
                </span>
              ) : (
                <strong>{selected.intensity} out of 10</strong>
              )}
            </span>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={selected.intensity ?? 5}
              onChange={(e) =>
                commit(setIntensity(marks, selected.id, Number(e.target.value)))
              }
              className="h-11 w-full accent-primary"
            />
            <span className="flex justify-between text-base text-muted-foreground">
              <span>0 no pain</span>
              <span>10 worst</span>
            </span>
          </label>
        )}
      </section>

      <p className="text-muted-foreground">
        Tap a body part to mark it. Tap it again to remove it. Drag sideways to
        turn the body, or use the buttons.
      </p>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
