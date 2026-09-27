/**
 * Small line drawing of a standing figure, used as the thumbnail on the step
 * card. Deliberately a flat outline rather than a render of the 3D model:
 * it loads instantly and reads at 14px wide, where the model does not.
 */
export function FigureMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 56 104"
      fill="none"
      aria-hidden
      className={className}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Head, then a single continuous body outline in an A-pose —
          the same silhouette as the 3D model on the marking screen. */}
      <ellipse cx="28" cy="10" rx="6.4" ry="7.6" />
      <path
        d="M28 18.5c-4.6 0-7.4 1.8-8.6 4.6-1 2.4-1.5 5.2-1.9 8l-3.6 12.2c-.5 1.8-2 2.5-3.2 2.1-1.1-.4-1.6-1.6-1.3-3l2.6-12.4"
        strokeWidth="1.5"
      />
      <path
        d="M28 18.5c4.6 0 7.4 1.8 8.6 4.6 1 2.4 1.5 5.2 1.9 8l3.6 12.2c.5 1.8 2 2.5 3.2 2.1 1.1-.4 1.6-1.6 1.3-3l-2.6-12.4"
        strokeWidth="1.5"
      />
      <path
        d="M18.9 37.5c-.5 5-.8 10-.6 14.8.2 4.4.8 7.4 1.3 10.6l1.4 15c.3 3.4.5 7.6.4 11.2l-.3 12.6"
        strokeWidth="1.5"
      />
      <path
        d="M37.1 37.5c.5 5 .8 10 .6 14.8-.2 4.4-.8 7.4-1.3 10.6l-1.4 15c-.3 3.4-.5 7.6-.4 11.2l.3 12.6"
        strokeWidth="1.5"
      />
      <path d="M28 55.5v46" strokeWidth="1.2" opacity="0.5" />
      <path d="M20.4 55h15.2" strokeWidth="1.2" opacity="0.5" />
    </svg>
  );
}
