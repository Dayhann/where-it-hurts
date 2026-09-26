'use client';

import { useEffect, useRef } from 'react';
import GravityLetters from '@/components/ui/gravity-letters';

const DROPS = 14;
const GAP_MS = 90;

export function ThanksLetters({ word, hint }: { word: string; hint: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const letters = Array.from(word.replace(/\s/g, '').toUpperCase());

  useEffect(() => {
    const box = wrapRef.current?.querySelector<HTMLElement>(
      '[data-slot="gravity-letters"]',
    );
    if (!box) return;
    const timers = Array.from({ length: DROPS }, (_, index) =>
      setTimeout(() => {
        const rect = box.getBoundingClientRect();
        const init = {
          bubbles: true,
          button: 0,
          pointerId: 1000 + index,
          clientX: rect.left + rect.width * ((index + 0.5) / DROPS),
          clientY: rect.top + 12,
        };
        box.dispatchEvent(new PointerEvent('pointerdown', init));
        box.dispatchEvent(new PointerEvent('pointerup', init));
      }, index * GAP_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div ref={wrapRef}>
      <GravityLetters
        items={letters}
        size={34}
        color="var(--primary)"
        maxGlyphs={60}
        deviceTilt={false}
        className="h-44 cursor-pointer rounded-xl border border-border bg-card"
      >
        <p className="p-4 text-lg text-muted-foreground">{hint}</p>
      </GravityLetters>
    </div>
  );
}
