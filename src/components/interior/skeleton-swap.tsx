// Adapted from interior.dev (https://www.interior.dev). MIT, Copyright (c) 2026 ozzy. See ./LICENSE.
'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

const CROSSFADE = {
  type: 'spring',
  stiffness: 260,
  damping: 34,
  mass: 0.8,
} as const;

const WIDTHS = [100, 93, 97, 88, 95, 91] as const;

function widthFor(index: number, total: number) {
  if (total > 1 && index === total - 1) return 62;
  return WIDTHS[(index * 7 + 3) % WIDTHS.length];
}

export type UseSkeletonSwapOptions = {
  ready: boolean;
  delay?: number;
  minVisible?: number;
};

export function useSkeletonSwap({
  ready,
  delay = 120,
  minVisible = 380,
}: UseSkeletonSwapOptions) {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (!ready) {
      if (visible) return;
      const t = setTimeout(() => {
        shownAt.current = performance.now();
        setVisible(true);
      }, delay);
      return () => clearTimeout(t);
    }

    if (!visible) return;
    const rest = Math.max(
      0,
      minVisible - (performance.now() - shownAt.current),
    );
    const t = setTimeout(() => setVisible(false), rest);
    return () => clearTimeout(t);
  }, [ready, visible, delay, minVisible]);

  return { showSkeleton: visible, busy: !ready };
}

export function SkeletonLines({
  lines = 3,
  lineHeight = 24,
  barHeight = 10,
  className = '',
}: {
  lines?: number;
  lineHeight?: number;
  barHeight?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      aria-hidden
      className={`w-full ${className}`}
      initial={reduced ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reduced ? { duration: 0 } : CROSSFADE}
    >
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="flex items-center"
          style={{ height: lineHeight }}
        >
          <div
            className="rounded-[5px] bg-muted"
            style={{ height: barHeight, width: `${widthFor(i, lines)}%` }}
          />
        </div>
      ))}
    </motion.div>
  );
}
