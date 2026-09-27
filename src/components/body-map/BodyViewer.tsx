'use client';

import { Line, OrbitControls, useGLTF } from '@react-three/drei';
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from '@react-three/fiber';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Hand,
  Plus,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import {
  forwardRef,
  Suspense,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { patientCopy } from '@/components/i18n/patient';
import { Dropdown } from '@/components/interior/dropdown';
import { HoldToConfirm } from '@/components/interior/hold-to-confirm';
import { SegmentedControl } from '@/components/interior/segmented-control';
import { SliderDetents } from '@/components/interior/slider-detents';
import { REGION_BY_ID, REGIONS } from '@/contracts/regions';
import type { BodyMark, Lang } from '@/contracts/types';
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
  front: { azimuth: 0 },
  back: { azimuth: Math.PI },
  left: { azimuth: Math.PI / 2 },
  right: { azimuth: -Math.PI / 2 },
} as const;

type Preset = keyof typeof PRESETS;

/* Warm stone figure on bone paper, to sit inside the new palette rather
   than the old blue-grey. Pain stays a true clinical red and spread an
   amber — those two must remain unambiguous, so they are the only
   saturated colours in the scene. */
const COLORS = {
  skin: '#cfcec6',
  hover: '#dedcd3',
  eyes: '#95958c',
  outline: '#fbfaf6',
  pain: '#b3342f',
  spread: '#c8862c',
} as const;

const MARK_KINDS: MarkKind[] = ['pain', 'spread'];

/** The two face-on views get plain labels; the side views get chevrons. */
const FACE_PRESETS = ['front', 'back'] as const satisfies readonly Preset[];

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
  onRegionPoints,
}: {
  marks: BodyMark[];
  hovered: string | null;
  debug: boolean;
  onHover: (regionId: string | null) => void;
  onTap: (regionId: string | null, point: BodyMark['point']) => void;
  onRegionPoints: (points: ReadonlyMap<string, BodyMark['point']>) => void;
}) {
  const { scene } = useGLTF(MODEL_URL);

  const { root, materials, regionPoints } = useMemo(() => {
    const next = scene.clone(true);
    const byName = new Map<string, THREE.MeshStandardMaterial>();
    const points = new Map<string, BodyMark['point']>();
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
        if (REGION_BY_ID[obj.name]) {
          obj.geometry.computeBoundingBox();
          const center = obj.geometry.boundingBox?.getCenter(
            new THREE.Vector3(),
          );
          if (center) {
            obj.localToWorld(center);
            points.set(obj.name, center.toArray() as BodyMark['point']);
          }
        }
      }
    });
    return { root: next, materials: byName, regionPoints: points };
  }, [scene]);

  useEffect(() => onRegionPoints(regionPoints), [onRegionPoints, regionPoints]);

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

export type BodySnapshots = { front: string; back: string };

type SnapshotCaptureHandle = {
  capture: () => BodySnapshots;
};

const SnapshotCapture = forwardRef<SnapshotCaptureHandle>(
  function SnapshotCapture(_, ref) {
    const { camera, gl, scene } = useThree();

    useImperativeHandle(
      ref,
      () => ({
        capture() {
          const position = camera.position.clone();
          const quaternion = camera.quaternion.clone();

          const renderAt = (z: number) => {
            camera.position.set(0, HEIGHT, z);
            camera.lookAt(...TARGET);
            camera.updateMatrixWorld();
            gl.render(scene, camera);
            return gl.domElement.toDataURL('image/png');
          };

          const front = renderAt(2.9);
          const back = renderAt(-2.9);

          camera.position.copy(position);
          camera.quaternion.copy(quaternion);
          camera.updateMatrixWorld();
          gl.render(scene, camera);

          return { front, back };
        },
      }),
      [camera, gl, scene],
    );

    return null;
  },
);

type BodyViewerProps = {
  marks: BodyMark[];
  onChange: (marks: BodyMark[]) => void;
  variant?: 'full' | 'thumbnail';
  onDone?: (snapshots: BodySnapshots) => Promise<void>;
  lang?: Lang;
  carerMode?: boolean;
};

export default function BodyViewer({
  marks,
  onChange,
  variant = 'full',
  onDone,
  lang = 'en',
  carerMode = false,
}: BodyViewerProps) {
  const controls = useRef<OrbitControlsImpl>(null);
  const snapshotCapture = useRef<SnapshotCaptureHandle>(null);
  const dragStartAzimuth = useRef(0);
  const [preset, setPreset] = useState<Preset>('front');
  const [lock, setLock] = useState(true);
  const [kind, setKind] = useState<MarkKind>('pain');
  const [hovered, setHovered] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listRegionId, setListRegionId] = useState(REGIONS[0].id);
  const [regionPoints, setRegionPoints] = useState<
    ReadonlyMap<string, BodyMark['point']>
  >(new Map());
  const [past, setPast] = useState<BodyMark[][]>([]);
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState(false);
  const params = useSearchParams();
  const copy = patientCopy(lang).body;
  const kindLabel: Record<MarkKind, string> = {
    pain: copy.pain,
    spread: copy.spread,
  };
  const presetLabel: Record<Preset, string> = {
    front: copy.front,
    back: copy.back,
    left: carerMode ? copy.leftCarer : copy.left,
    right: carerMode ? copy.rightCarer : copy.right,
  };
  const debug = params.get('regions') === '1';
  const calibrate = params.get('calibrate') === '1';

  const compact = variant === 'thumbnail';
  const selected = marks.find((m) => m.id === selectedId) ?? null;
  const hoveredLabel = hovered ? REGION_BY_ID[hovered]?.label[lang] : null;
  const listRegion = REGION_BY_ID[listRegionId] ?? REGIONS[0];
  const listMark = marks.find((mark) => mark.regionId === listRegionId);

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
    <div className="flex flex-col gap-4">
      {!compact && (
        <SegmentedControl
          label={copy.marking}
          className="block w-full rounded-full! border-transparent! bg-muted! p-1! [&_span]:py-2.5 [&_span]:text-base [&_span]:leading-7 [&>div>div.pointer-events-none.absolute]:button-raised! [&>div>div.pointer-events-none.absolute]:rounded-full!"
          value={kind}
          onValueChange={(next) => setKind(next as MarkKind)}
          options={MARK_KINDS.map((k) => ({
            value: k,
            label: kindLabel[k],
          }))}
        />
      )}

      <div
        className={cn(
          !compact && 'grid grid-cols-[1fr_7rem] items-stretch gap-2.5',
        )}
      >
        <div
          className={cn(
            'surface-inset relative overflow-hidden bg-muted',
            compact ? 'body-canvas-locked' : 'body-canvas-scroll-safe',
          )}
        >
          <div
            role="img"
            aria-label={compact ? copy.thumbnail : copy.interactive}
            className={cn(
              // Capped at 46vh so the marking controls and "Done marking"
              // stay within reach on a 375x812 phone instead of sitting
              // ~500px below the fold.
              compact ? 'h-36 w-full' : 'h-[min(46vh,26rem)] w-full',
              hovered && !compact && 'cursor-pointer',
              compact && 'pointer-events-none',
            )}
          >
            <Canvas
              key={compact ? 'thumbnail' : 'full'}
              camera={{
                position: compact ? [0, HEIGHT, 3.8] : [0, HEIGHT, 2.9],
                fov: compact ? 42 : 35,
              }}
              gl={{ preserveDrawingBuffer: true, antialias: true }}
              dpr={[1, 1.5]}
            >
              <color attach="background" args={['#f7f6f1']} />
              <hemisphereLight args={['#fdfcf7', '#c6c9bf', 1.2]} />
              <directionalLight position={[2.2, 4, 2.5]} intensity={1.15} />
              <directionalLight position={[-2, 1.5, -1.5]} intensity={0.35} />
              <Suspense fallback={null}>
                <BodyModel
                  marks={marks}
                  hovered={hovered}
                  debug={debug}
                  onHover={setHovered}
                  onTap={handleTap}
                  onRegionPoints={setRegionPoints}
                />
                <MarkVisuals marks={marks} />
              </Suspense>
              <PresetRig
                azimuth={PRESETS[preset].azimuth}
                lock={lock}
                controls={controls}
              />
              <SnapshotCapture ref={snapshotCapture} />
              <OrbitControls
                ref={controls}
                target={TARGET}
                enablePan={false}
                enableRotate={!compact}
                enableZoom={!compact}
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
          {hoveredLabel && !compact && (
            <p className="pointer-events-none absolute top-2 left-2 rounded-xl bg-background/90 px-2 py-1 text-lg">
              {hoveredLabel}
            </p>
          )}
          {calibrate && !compact && (
            <p className="absolute right-2 bottom-2 rounded-xl bg-background/90 px-2 py-1 text-lg">
              {copy.calibration}
            </p>
          )}
        </div>

        {/* Control column beside the model: the two face-on views, the two
          side views with direction chevrons, then undo and clear. */}
        {!compact && (
          <div className="flex flex-col gap-2">
            {FACE_PRESETS.map((key) => (
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
                  }),
                  'h-[46px] text-[14.5px] leading-[18px] tracking-[0.3px] w-full',
                )}
              >
                {presetLabel[key]}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setPreset('left');
                setLock(true);
              }}
              aria-pressed={lock && preset === 'left'}
              className={cn(
                buttonVariants({
                  variant: lock && preset === 'left' ? 'default' : 'outline',
                }),
                'h-[46px] text-[14.5px] leading-[18px] tracking-[0.3px] w-full justify-start gap-1 px-2.5 whitespace-normal',
              )}
            >
              <ChevronLeft aria-hidden className="size-3.5 shrink-0" />
              <span className="flex-1 text-start">{presetLabel.left}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPreset('right');
                setLock(true);
              }}
              aria-pressed={lock && preset === 'right'}
              className={cn(
                buttonVariants({
                  variant: lock && preset === 'right' ? 'default' : 'outline',
                }),
                'h-[46px] text-[14.5px] leading-[18px] tracking-[0.3px] w-full justify-start gap-1 px-2.5 whitespace-normal',
              )}
            >
              <span className="flex-1 text-start">{presetLabel.right}</span>
              <ChevronRight aria-hidden className="size-3.5 shrink-0" />
            </button>

            <button
              type="button"
              onClick={undo}
              disabled={past.length === 0}
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'h-[46px] text-[14.5px] leading-[18px] tracking-[0.3px] w-full justify-start gap-1.5 px-2.5 text-start whitespace-normal',
              )}
            >
              <Undo2 aria-hidden className="size-3.5 shrink-0" />
              <span className="flex-1">{copy.undo}</span>
            </button>

            <HoldToConfirm
              disabled={marks.length === 0}
              confirmLabel={copy.cleared}
              onConfirm={() => {
                setSelectedId(null);
                commit([]);
              }}
              className="button-raised-soft! type-body! h-[46px]! w-full rounded-full! px-2.5! [&>span.absolute]:bg-primary! [&>span.absolute]:text-primary-foreground! [&_span]:justify-start! [&_span]:gap-2!"
            >
              <Trash2 aria-hidden className="size-3.5 shrink-0" />
              <span className="flex-1 text-start">{copy.clearShort}</span>
            </HoldToConfirm>
          </div>
        )}
      </div>

      {!compact && (
        <>
          <section aria-label={copy.places} className="flex flex-col gap-3">
            <p className="flex items-center gap-2.5 text-muted-foreground">
              <Hand aria-hidden className="size-4 shrink-0 text-strong" />
              {copy.tapHint}
            </p>
            {marks.length === 0 ? (
              <p className="text-muted-foreground">{copy.nothing}</p>
            ) : (
              /* Full-width rows, per the reference: a filled check circle
                 in the mark's own colour, the region name, its intensity,
                 and a dismiss control. */
              <ul className="flex flex-col gap-2.5">
                {marks.map((m) => {
                  const label =
                    REGION_BY_ID[m.regionId]?.label[lang] ?? m.regionId;
                  const isSelected = m.id === selectedId;
                  return (
                    <li
                      key={m.id}
                      data-selected={isSelected}
                      className="card-row overflow-hidden !px-0"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(isSelected ? null : m.id)}
                        aria-pressed={isSelected}
                        className="flex min-h-13 flex-1 items-center gap-3 px-4 text-start outline-none focus-visible:bg-muted"
                      >
                        {/* Filled tick once a severity has been given,
                            hollow circle while one is still outstanding —
                            so the list doubles as a to-do. The fill uses
                            the mark's own colour, which is the one piece
                            of information the reference row does not
                            carry. */}
                        {m.intensity === undefined ? (
                          <span
                            aria-hidden
                            className="size-5 shrink-0 rounded-full border-2 border-strong/40"
                          />
                        ) : (
                          <span
                            aria-hidden
                            className="flex size-5 shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: COLORS[m.kind] }}
                          >
                            <Check className="size-3 text-white" />
                          </span>
                        )}
                        <span className="flex-1 truncate">{label}</span>
                        {m.intensity !== undefined && (
                          <span className="shrink-0 text-muted-foreground tabular-nums">
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
                        aria-label={`${copy.remove} ${label}`}
                        className="flex size-12 shrink-0 items-center justify-center text-strong/70 outline-none hover:text-strong focus-visible:bg-muted"
                      >
                        <X className="size-4" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {selected && (
              <div className="surface-inset flex flex-col gap-2 bg-background p-3">
                <p>
                  {REGION_BY_ID[selected.regionId]?.label[lang]}:{' '}
                  {copy.severity}{' '}
                  {selected.intensity === undefined ? (
                    <span className="text-muted-foreground">
                      {copy.sliderHint}
                    </span>
                  ) : (
                    <strong>
                      {selected.intensity} {copy.outOfTen}
                    </strong>
                  )}
                </p>
                <SliderDetents
                  key={selected.id}
                  label={copy.sliderLabel}
                  min={0}
                  max={10}
                  step={1}
                  value={selected.intensity ?? 5}
                  detents={[
                    { value: 0, label: copy.noPainShort },
                    { value: 10, label: copy.worstShort },
                  ]}
                  format={(value) =>
                    selected.intensity === undefined
                      ? '–'
                      : `${value} ${copy.outOfTen}`
                  }
                  onValueChange={(value) =>
                    commit(setIntensity(marks, selected.id, value))
                  }
                  className="overflow-x-clip [&_.bg-stone-800]:bg-primary! [&>div:first-child]:sr-only"
                />
              </div>
            )}
          </section>

          <details className="card-row flex-col items-stretch !px-0 [&[open]]:pb-3">
            <summary className="flex min-h-13 cursor-pointer list-none items-center gap-3 px-4 font-medium [&::-webkit-details-marker]:hidden">
              <Plus aria-hidden className="size-4 shrink-0 text-strong" />
              <span className="flex-1">{copy.chooseList}</span>
              <ChevronRight
                aria-hidden
                className="size-4 shrink-0 text-strong transition-transform rtl:-scale-x-100"
              />
            </summary>
            <div className="px-4">
              <div className="mt-1 flex flex-col gap-3">
                <Dropdown
                  label={`${copy.bodyPart}: ${listRegion.label[lang]}`}
                  value={listRegionId}
                  onChange={setListRegionId}
                  items={REGIONS.map((region) => {
                    const marked = marks.find((m) => m.regionId === region.id);
                    return {
                      value: region.id,
                      label: region.label[lang],
                      hint: marked ? kindLabel[marked.kind] : undefined,
                    };
                  })}
                  className="block w-full [&_li]:text-lg! [&_li_.font-mono]:font-sans! [&_li_.font-mono]:text-sm! [&_ul]:max-h-72! [&>button]:button-raised-soft! [&>button]:h-[46px]! [&>button]:w-full [&>button]:justify-between [&>button]:rounded-full! [&>button]:px-5! [&>button]:text-lg! [&>button]:font-normal! [&>button_svg]:text-strong! [&>div]:right-0 [&>div]:rounded-[14px]! [&>div]:border-transparent! [&>div]:shadow-[var(--elevation-3)]!"
                />
                <button
                  type="button"
                  disabled={!regionPoints.has(listRegionId)}
                  onClick={() => {
                    const point = regionPoints.get(listRegionId);
                    if (point) handleTap(listRegionId, point);
                  }}
                  className={cn(
                    buttonVariants({
                      variant: listMark?.kind === kind ? 'outline' : 'default',
                      size: 'touch',
                    }),
                    'text-lg',
                  )}
                >
                  {listMark?.kind === kind
                    ? `${copy.remove} ${listRegion.label[lang]}`
                    : `${copy.mark} ${listRegion.label[lang]} ${copy.as} ${kindLabel[kind]}`}
                </button>
              </div>
            </div>
          </details>

          {onDone && (
            <>
              {captureError && (
                <p className="text-lg text-destructive" role="alert">
                  {copy.saveError}
                </p>
              )}
              <button
                type="button"
                disabled={capturing}
                onClick={async () => {
                  const capture = snapshotCapture.current;
                  if (!capture) return;
                  setCapturing(true);
                  setCaptureError(false);
                  try {
                    await onDone(capture.capture());
                  } catch {
                    setCaptureError(true);
                  } finally {
                    setCapturing(false);
                  }
                }}
                className={cn(buttonVariants({ size: 'touch' }), 'text-base')}
              >
                {capturing ? copy.saving : copy.next}
                <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" />
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

useGLTF.preload(MODEL_URL);
