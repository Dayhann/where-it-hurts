/**
 * Layered ridgeline scene behind the masthead.
 *
 * The design reference uses a photograph of misted mountains. Rather than
 * ship a stock photo, this draws the same idea: receding ridges that get
 * paler and hazier with distance, fading into the page colour at the
 * bottom. Swap it for a real image by dropping one behind this layer.
 */
export function HeroRidges({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 390 190"
      preserveAspectRatio="none"
      aria-hidden
      className={className}
    >
      <defs>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.88 0.016 155)" />
          <stop offset="100%" stopColor="oklch(0.938 0.006 80)" />
        </linearGradient>
        <linearGradient id="hero-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.938 0.006 80 / 0)" />
          <stop offset="55%" stopColor="oklch(0.938 0.006 80 / 0.66)" />
          <stop offset="88%" stopColor="oklch(0.938 0.006 80)" />
          <stop offset="100%" stopColor="oklch(0.938 0.006 80)" />
        </linearGradient>
      </defs>

      <rect width="390" height="190" fill="url(#hero-sky)" />

      {/* Farthest ridge — palest, lowest contrast. */}
      <path
        d="M0 118 58 74l34 26 40-38 52 44 44-30 60 48 42-26 20 14v70H0Z"
        fill="oklch(0.6 0.03 155)"
        opacity="0.3"
      />
      {/* Middle ridge. */}
      <path
        d="M0 142 46 104l40 30 46-24 42 34 56-28 54 40 66-30v124H0Z"
        fill="oklch(0.47 0.038 152)"
        opacity="0.42"
      />
      {/* Nearest ridge — darkest, most defined. */}
      <path
        d="M0 176 70 132l38 26 54-18 48 30 62-22 58 32 60-18v58H0Z"
        fill="oklch(0.345 0.035 148)"
        opacity="0.55"
      />

      <rect width="390" height="190" fill="url(#hero-fade)" />
    </svg>
  );
}
