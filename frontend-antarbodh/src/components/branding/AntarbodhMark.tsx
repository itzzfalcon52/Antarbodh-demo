interface AntarbodhMarkProps {
  size?: number;
}

/**
 * The mark reads as a surface line with reconstructed
 * isotherms descending beneath it — the product's core idea
 * reduced to four strokes.
 */
export function AntarbodhMark({ size = 26 }: AntarbodhMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="ANTARBODH"
    >
      {/* Surface observation */}
      <path
        d="M1.5 6.5C5.5 6.5 7.5 3.5 12 3.5C16.5 3.5 18.5 6.5 22.5 6.5"
        stroke="var(--color-ocean-bright)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Reconstructed subsurface isotherms */}
      <path
        d="M1.5 11C5.5 11 7.5 8 12 8C16.5 8 18.5 11 22.5 11"
        stroke="var(--color-ocean)"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.78"
      />
      <path
        d="M1.5 15.5C5.5 15.5 7.5 12.5 12 12.5C16.5 12.5 18.5 15.5 22.5 15.5"
        stroke="var(--color-ocean)"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M1.5 20C5.5 20 7.5 17 12 17C16.5 17 18.5 20 22.5 20"
        stroke="var(--color-ocean)"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.26"
      />
    </svg>
  );
}
