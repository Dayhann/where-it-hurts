'use client';

/**
 * Rectangular wash of Rare UI's Fluid Orb shader (Swami Malode, rareui.com).
 * The orb file in `src/components/ui/fluid-orb.tsx` stays untouched; this
 * drops the circular mask, fills the masthead, and tints to forest green.
 */
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const FOREST = '#2D3E2F';

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_color;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.6;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float t = u_time * 0.48;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);

  vec2 drift = vec2(
    sin(t) + 0.6 * sin(t * 1.7 + 1.3),
    cos(t * 0.8) + 0.6 * cos(t * 1.3 + 2.1)
  );

  vec2 p = vec2(uv.x * aspect, uv.y) + drift * 1.15;

  vec2 q = vec2(fbm(p + drift), fbm(p + vec2(3.2, 1.5) - drift));
  float f = fbm(p + 1.2 * q);

  float g = clamp(uv.y, 0.0, 1.0);
  float anchor = smoothstep(0.0, 0.3, uv.y);
  float shade = clamp(g + (f - 0.5) * 0.95 * anchor, 0.0, 1.0);

  vec3 white = vec3(0.925, 0.918, 0.902);
  vec3 light = mix(white, u_color, 0.5);
  vec3 dark = u_color;

  vec3 col = white;
  col = mix(col, light, smoothstep(0.28, 0.52, shade));
  col = mix(col, dark, smoothstep(0.58, 0.88, shade));

  gl_FragColor = vec4(col, 1.0);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  const n = parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) return [0.227, 0.325, 0.271];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function HeroFluid({ className }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const opts: WebGLContextAttributes = {
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    };
    const gl = (canvas.getContext('webgl', opts) ??
      canvas.getContext(
        'experimental-webgl',
        opts,
      )) as WebGLRenderingContext | null;
    if (!gl) {
      setFallback(true);
      return;
    }

    const program = gl.createProgram();
    const vert = compile(gl, gl.VERTEX_SHADER, VERT);
    const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!program || !vert || !frag) {
      setFallback(true);
      return;
    }

    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setFallback(true);
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');
    gl.uniform3f(
      gl.getUniformLocation(program, 'u_color'),
      ...hexToRgb(FOREST),
    );

    const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduce = reduceMq.matches;
    const start = performance.now();
    let raf = 0;
    let running = true;

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(wrap.clientWidth * dpr));
      const h = Math.max(1, Math.round(wrap.clientHeight * dpr));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uResolution, w, h);
    };

    const render = (now: number) => {
      if (!running) return;
      fit();
      gl.uniform1f(uTime, reduce ? 0 : (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (!reduce && document.visibilityState === 'visible') {
        raf = requestAnimationFrame(render);
      }
    };

    const kick = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(render);
    };

    const onReduce = () => {
      reduce = reduceMq.matches;
      kick();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') kick();
    };

    const ro = new ResizeObserver(() => {
      fit();
      if (reduce) render(start);
    });
    ro.observe(wrap);
    if (typeof reduceMq.addEventListener === 'function') {
      reduceMq.addEventListener('change', onReduce);
    } else {
      reduceMq.addListener(onReduce);
    }
    document.addEventListener('visibilitychange', onVisibility);
    kick();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (typeof reduceMq.removeEventListener === 'function') {
        reduceMq.removeEventListener('change', onReduce);
      } else {
        reduceMq.removeListener(onReduce);
      }
      document.removeEventListener('visibilitychange', onVisibility);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 z-0 overflow-hidden',
        fallback && 'hero-fluid-css',
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        className={cn('absolute inset-0 h-full w-full', fallback && 'hidden')}
      />
      {!fallback && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, transparent 88%, var(--background) 100%)',
          }}
        />
      )}
    </div>
  );
}
