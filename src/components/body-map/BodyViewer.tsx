'use client';

import { OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef, useState, type RefObject } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MODEL_URL = '/models/body.glb';
const HEIGHT = 1;
const TARGET: [number, number, number] = [0, HEIGHT, 0];

const PRESETS = {
  front: 0,
  right: Math.PI / 2,
  back: Math.PI,
  left: -Math.PI / 2,
} as const;

type Preset = keyof typeof PRESETS;

function shortestAngle(from: number, to: number) {
  return from + Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function BodyMesh() {
  const { scene } = useGLTF(MODEL_URL);
  const cloned = useMemo(() => {
    const next = scene.clone(true);
    const material = new THREE.MeshStandardMaterial({
      color: '#9aa3ad',
      roughness: 0.75,
      metalness: 0.04,
    });
    next.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = material;
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });
    return next;
  }, [scene]);

  return <primitive object={cloned} />;
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

function Scene({
  azimuth,
  lock,
  controls,
  onDragStart,
}: {
  azimuth: number;
  lock: boolean;
  controls: RefObject<OrbitControlsImpl | null>;
  onDragStart: () => void;
}) {
  return (
    <>
      <color attach="background" args={['#f3efe6']} />
      <hemisphereLight args={['#f7f3ea', '#b7c0c7', 1.15]} />
      <directionalLight position={[2.2, 4, 2.5]} intensity={1.15} />
      <directionalLight position={[-2, 1.5, -1.5]} intensity={0.35} />
      <BodyMesh />
      <PresetRig azimuth={azimuth} lock={lock} controls={controls} />
      <OrbitControls
        ref={controls}
        target={TARGET}
        enablePan={false}
        enableDamping
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
        minDistance={2.2}
        maxDistance={4.5}
        onStart={onDragStart}
      />
    </>
  );
}

export default function BodyViewer() {
  const controls = useRef<OrbitControlsImpl>(null);
  const [preset, setPreset] = useState<Preset>('front');
  const [lock, setLock] = useState(true);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
        <div className="h-[min(56vh,28rem)] w-full">
          <Canvas
            camera={{ position: [0, HEIGHT, 3], fov: 35 }}
            gl={{ preserveDrawingBuffer: true, antialias: true }}
            dpr={[1, 1.5]}
          >
            <Suspense fallback={null}>
              <Scene
                azimuth={PRESETS[preset]}
                lock={lock}
                controls={controls}
                onDragStart={() => setLock(false)}
              />
            </Suspense>
          </Canvas>
        </div>
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
              'capitalize',
            )}
          >
            {key}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Drag sideways to turn, or use the buttons. You can mark the pain on the
        next step.
      </p>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
