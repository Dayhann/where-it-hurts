// Adapted from interior.dev (https://www.interior.dev). MIT, Copyright (c) 2026 ozzy. See ./LICENSE.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react';

const CELL = {
  type: 'spring',
  stiffness: 520,
  damping: 34,
  mass: 0.45,
} as const;

const SEG = {
  sm: 'px-3 py-1.5 text-sm font-medium leading-5',
  touch: 'min-h-11 px-3 py-2 text-lg font-medium leading-7',
} as const;

export type SegmentedOption<T extends string = string> = {
  value: T;
  label: string;
  swatch?: string;
  disabled?: boolean;
};

export type SegmentedControlProps<T extends string = string> = {
  options: SegmentedOption<T>[];
  label: string;
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
  size?: keyof typeof SEG;
  className?: string;
};

function Face({
  option,
  seg,
  className,
}: {
  option: SegmentedOption;
  seg: string;
  className: string;
}) {
  return (
    <span
      className={`${seg} flex items-center justify-center gap-2 text-center whitespace-nowrap ${className}`}
    >
      {option.swatch && (
        <span
          className="size-3 shrink-0 rounded-full ring-1 ring-background"
          style={{ backgroundColor: option.swatch }}
        />
      )}
      {option.label}
    </span>
  );
}

export function SegmentedControl<T extends string = string>({
  options,
  label,
  value,
  defaultValue,
  onValueChange,
  size = 'sm',
  className = '',
}: SegmentedControlProps<T>) {
  const count = Math.max(1, options.length);
  const template = `repeat(${count}, minmax(0, 1fr))`;
  const seg = SEG[size];

  const [internal, setInternal] = useState<T | undefined>(
    () => defaultValue ?? options[0]?.value,
  );
  const [hovered, setHovered] = useState(-1);

  const controlled = value !== undefined;
  const current = controlled ? value : internal;
  const found = options.findIndex((o) => o.value === current);
  const index = found < 0 ? 0 : found;

  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const emit = useRef(onValueChange);
  useEffect(() => {
    emit.current = onValueChange;
  });

  const reduced = useReducedMotion();
  const pos = useMotionValue(index);
  const thumbX = useTransform(pos, (v) => `${v * 100}%`);
  const maskX = useTransform(pos, (v) => `${v * -100}%`);

  useEffect(() => {
    if (reduced) {
      pos.set(index);
      return;
    }
    const controls = animate(pos, index, CELL);
    return () => controls.stop();
  }, [index, reduced, pos]);

  const select = useCallback(
    (next: T) => {
      if (!controlled) setInternal(next);
      if (next !== current) emit.current?.(next);
    },
    [controlled, current],
  );

  const seek = useCallback(
    (from: number, dir: number) => {
      let i = from;
      for (let k = 0; k < count; k++) {
        i = (i + dir + count) % count;
        if (!options[i]?.disabled) return i;
      }
      return from;
    },
    [count, options],
  );

  const go = useCallback(
    (i: number) => {
      const option = options[i];
      if (!option || option.disabled) return;
      buttons.current[i]?.focus();
      select(option.value);
    },
    [options, select],
  );

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      go(seek(i, 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      go(seek(i, -1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      go(seek(count - 1, 1));
    } else if (e.key === 'End') {
      e.preventDefault();
      go(seek(0, -1));
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      dir="ltr"
      className={`relative rounded-lg border border-border bg-muted p-[3px] select-none ${className}`}
    >
      <div
        className="relative grid"
        style={{ gridTemplateColumns: template, touchAction: 'manipulation' }}
      >
        {options.map((option, i) => (
          <Face
            key={option.value}
            option={option}
            seg={seg}
            className={`pointer-events-none ${
              option.disabled
                ? 'text-muted-foreground/50'
                : hovered === i && i !== index
                  ? 'text-foreground'
                  : 'text-muted-foreground'
            }`}
          />
        ))}

        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden rounded-md bg-primary shadow-sm"
          style={{ width: `${100 / count}%`, x: thumbX }}
          initial={false}
        >
          <motion.div
            className="absolute inset-0"
            style={{ x: maskX }}
            initial={false}
          >
            <div
              className="absolute inset-y-0 left-0 grid"
              style={{
                width: `${count * 100}%`,
                gridTemplateColumns: template,
              }}
            >
              {options.map((option) => (
                <Face
                  key={option.value}
                  option={option}
                  seg={seg}
                  className="text-primary-foreground"
                />
              ))}
            </div>
          </motion.div>
        </motion.div>

        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: template }}
          onPointerLeave={() => setHovered(-1)}
        >
          {options.map((option, i) => (
            <button
              key={option.value}
              ref={(node) => {
                buttons.current[i] = node;
              }}
              type="button"
              role="radio"
              aria-checked={i === index}
              aria-disabled={option.disabled || undefined}
              tabIndex={i === index ? 0 : -1}
              onClick={() => !option.disabled && select(option.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              onPointerEnter={() => !option.disabled && setHovered(i)}
              className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="sr-only">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
