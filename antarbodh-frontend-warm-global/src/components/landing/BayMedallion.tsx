import { useId } from 'react';

import { DOMAIN } from '../../lib/constants';
import { BAY_LAND_PATH, projectBay } from './bayCoastline';

// 0.25° grid spacing in map units (20 px per degree).
const CELL = DOMAIN.RESOLUTION * 20;

const [DX0, DY0] = projectBay(DOMAIN.LAT_MAX, DOMAIN.LON_MIN);
const [DX1, DY1] = projectBay(DOMAIN.LAT_MIN, DOMAIN.LON_MAX);

const CX = (DX0 + DX1) / 2;
const CY = (DY0 + DY1) / 2;
const R = 252;

const [SAMPLE_X, SAMPLE_Y] = projectBay(12.5, 88);

const PLACES: { label: string; lat: number; lon: number; anchor?: 'start' | 'middle' | 'end' }[] = [
  { label: 'India', lat: 17.2, lon: 80.4 },
  { label: 'Sri Lanka', lat: 6.4, lon: 81.6, anchor: 'start' },
  { label: 'Bangladesh', lat: 23.3, lon: 90.2 },
  { label: 'Myanmar', lat: 20.4, lon: 96.2 },
  { label: 'Andaman Sea', lat: 11.8, lon: 96.2 },
];

/**
 * The prototype domain drawn as a kolam: the model's 0.25° grid is
 * the pulli (dot grid) laid over the Bay of Bengal, framed by a ring
 * of dots the way a kolam is framed on a threshold.
 */
export function BayMedallion() {
  const id = useId();
  const ringDots = Array.from({ length: 72 }, (_, i) => (i / 72) * Math.PI * 2);

  return (
    <svg
      className="l-medallion"
      viewBox={`${CX - 282} ${CY - 282} 564 564`}
      role="img"
      aria-labelledby={`${id}-title`}
    >
      <title id={`${id}-title`}>
        Map of the Bay of Bengal with the Antarbodh prototype domain,
        5 to 20 degrees north and 80 to 100 degrees east, covered by a
        0.25 degree grid.
      </title>

      <defs>
        <pattern
          id={`${id}-pulli`}
          x={DX0}
          y={DY0}
          width={CELL}
          height={CELL}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={CELL / 2} cy={CELL / 2} r={0.95} className="l-medallion__pulli" />
        </pattern>

        <radialGradient id={`${id}-sea`} cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor="#24317F" />
          <stop offset="100%" stopColor="#0C1240" />
        </radialGradient>

        <clipPath id={`${id}-disc`}>
          <circle cx={CX} cy={CY} r={R} />
        </clipPath>
      </defs>

      {/* Frame of dots */}
      {ringDots.map((angle, i) => (
        <circle
          key={i}
          cx={CX + Math.cos(angle) * (R + 22)}
          cy={CY + Math.sin(angle) * (R + 22)}
          r={i % 6 === 0 ? 2.6 : 1.5}
          className="l-medallion__ring-dot"
        />
      ))}
      <circle cx={CX} cy={CY} r={R + 10} className="l-medallion__ring" />

      <g clipPath={`url(#${id}-disc)`}>
        <rect x={CX - R} y={CY - R} width={R * 2} height={R * 2} fill={`url(#${id}-sea)`} />

        <rect
          x={DX0}
          y={DY0}
          width={DX1 - DX0}
          height={DY1 - DY0}
          fill={`url(#${id}-pulli)`}
        />

        <path d={BAY_LAND_PATH} className="l-medallion__land" />

        <rect
          x={DX0}
          y={DY0}
          width={DX1 - DX0}
          height={DY1 - DY0}
          className="l-medallion__domain"
        />

        <text x={projectBay(15.6, 86.4)[0]} y={projectBay(15.6, 86.4)[1]} className="l-medallion__sea-name">
          Bay of Bengal
        </text>

        {PLACES.map(({ label, lat, lon, anchor = 'middle' }) => {
          const [x, y] = projectBay(lat, lon);
          return (
            <text key={label} x={x} y={y} textAnchor={anchor} className="l-medallion__place">
              {label}
            </text>
          );
        })}

        <text x={DX0 + 6} y={DY0 - 8} className="l-medallion__coord">20°N 80°E</text>
        <text x={DX1 - 6} y={DY1 + 18} textAnchor="end" className="l-medallion__coord">5°N 100°E</text>

        <circle cx={SAMPLE_X} cy={SAMPLE_Y} r={11} className="l-medallion__pulse" />
        <circle cx={SAMPLE_X} cy={SAMPLE_Y} r={4.5} className="l-medallion__point" />
        <text x={SAMPLE_X + 12} y={SAMPLE_Y + 22} className="l-medallion__point-label">
          12.5°N 88°E
        </text>
      </g>
    </svg>
  );
}
