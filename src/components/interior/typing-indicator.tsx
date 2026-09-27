// Adapted from interior.dev (https://www.interior.dev). MIT, Copyright (c) 2026 ozzy. See ./LICENSE.
'use client';

import { useEffect, useState } from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'motion/react';

const WAVE_MS = 1.25;

const SURFACE = {
  type: 'spring',
  stiffness: 380,
  damping: 30,
  mass: 0.8,
} as const;
const EASE = [0.23, 1, 0.32, 1] as const;
const INSTANT = { duration: 0 } as const;

function Dot({
  index,
  wave,
  size,
}: {
  index: number;
  wave: MotionValue<number>;
  size: number;
}) {
  const lift = useTransform(wave, (w) => {
    let distance = (w - index) % 3;
    if (distance < 0) distance += 3;
    if (distance > 1.5) distance -= 3;
    return Math.max(0, 1 - Math.abs(distance));
  });

  const scale = useTransform(lift, [0, 1], [0.74, 1]);
  const opacity = useTransform(lift, [0, 1], [0.32, 1]);

  return (
    <motion.span
      className="block rounded-full bg-muted-foreground"
      style={{ width: size, height: size, scale, opacity }}
    />
  );
}

export type TypingIndicatorProps = {
  active: boolean;
  /** Read by screen readers; never shown. */
  label: string;
  size?: number;
  className?: string;
};

export function TypingIndicator({
  active,
  label,
  size = 34,
  className = '',
}: TypingIndicatorProps) {
  const reduced = useReducedMotion();

  const wave = useMotionValue(0);
  useEffect(() => {
    if (!active || reduced) {
      wave.jump(0);
      return;
    }
    const controls = animate(wave, 3, {
      duration: WAVE_MS,
      ease: 'linear',
      repeat: Infinity,
      repeatType: 'loop',
    });
    return () => controls.stop();
  }, [active, reduced, wave]);

  const next = active ? label : '';
  const [announced, setAnnounced] = useState(next);
  useEffect(() => {
    const timer = setTimeout(() => setAnnounced(next), 700);
    return () => clearTimeout(timer);
  }, [next]);

  const width = Math.round(size * 2);
  const dot = Math.round(size * 0.23);
  const gap = Math.round(size * 0.15);
  const radius = Math.round(size * 0.47);

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width, height: size }}
    >
      <AnimatePresence>
        {active ? (
          <motion.div
            key="bubble"
            aria-hidden
            className="absolute inset-0 flex items-center justify-center bg-secondary"
            style={{ borderRadius: radius, transformOrigin: '0% 100%', gap }}
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.74 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={
              reduced
                ? { opacity: 0, transition: INSTANT }
                : {
                    opacity: 0,
                    scale: 0.4,
                    transition: { duration: 0.26, ease: EASE },
                  }
            }
            transition={
              reduced
                ? INSTANT
                : { ...SURFACE, opacity: { duration: 0.18, ease: EASE } }
            }
          >
            {[0, 1, 2].map((i) =>
              reduced ? (
                <span
                  key={i}
                  className="block rounded-full bg-muted-foreground opacity-80"
                  style={{ width: dot, height: dot }}
                />
              ) : (
                <Dot key={i} index={i} wave={wave} size={dot} />
              ),
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announced}
      </span>
    </div>
  );
}
