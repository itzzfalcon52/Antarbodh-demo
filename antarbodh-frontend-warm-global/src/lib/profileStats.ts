import { DEEP_OCEAN, THERMOCLINE, UPPER_OCEAN } from './constants';

/**
 * Read-outs derived from a returned profile. These only compare the
 * values the model already produced at its 15 standard depths; no
 * values are interpolated or invented between levels.
 */

export interface ProfileLevel {
  depth: number;
  temp: number;
}

export function validLevels(
  depths: number[],
  temps: (number | null)[],
): ProfileLevel[] {
  const levels: ProfileLevel[] = [];

  depths.forEach((depth, i) => {
    const temp = temps[i];
    if (temp !== null && temp !== undefined && Number.isFinite(temp)) {
      levels.push({ depth, temp });
    }
  });

  return levels;
}

export interface CoolingLayer {
  from: ProfileLevel;
  to: ProfileLevel;
  /** Temperature drop per 10 m of depth across the layer (°C). */
  dropPer10m: number;
}

/** The pair of adjacent levels where temperature falls fastest. */
export function steepestCooling(levels: ProfileLevel[]): CoolingLayer | null {
  let best: CoolingLayer | null = null;

  for (let i = 0; i < levels.length - 1; i++) {
    const from = levels[i];
    const to = levels[i + 1];
    const span = to.depth - from.depth;
    if (span <= 0) continue;

    const dropPer10m = ((from.temp - to.temp) / span) * 10;
    if (dropPer10m > 0 && (!best || dropPer10m > best.dropPer10m)) {
      best = { from, to, dropPer10m };
    }
  }

  return best;
}

export const DEPTH_GROUPS = [
  { title: 'Upper Ocean', depths: UPPER_OCEAN },
  { title: 'Thermocline', depths: THERMOCLINE },
  { title: 'Deep Ocean', depths: DEEP_OCEAN },
] as const;

/* ---------------------------------------------------------
   Temperature colour ramp: warm surface saffron through to a
   cool indigo, matching the landing page's surface-to-deep scale.
   --------------------------------------------------------- */

const RAMP: [number, [number, number, number]][] = [
  [0, [142, 151, 230]], // cold  — periwinkle indigo
  [0.35, [196, 110, 140]], //     — dusk rose
  [0.7, [226, 116, 64]], //       — kesar red
  [1, [244, 178, 84]], // warm   — haldi saffron
];

/** Colour for `temp` within [min, max]; warmer is more saffron. */
export function temperatureColor(temp: number, min: number, max: number): string {
  const t = max > min ? Math.min(1, Math.max(0, (temp - min) / (max - min))) : 1;

  for (let i = 0; i < RAMP.length - 1; i++) {
    const [t0, c0] = RAMP[i];
    const [t1, c1] = RAMP[i + 1];

    if (t <= t1) {
      const k = (t - t0) / (t1 - t0);
      const [r, g, b] = c0.map((v, j) => Math.round(v + (c1[j] - v) * k));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  const [r, g, b] = RAMP[RAMP.length - 1][1];
  return `rgb(${r}, ${g}, ${b})`;
}

export function formatDepth(depth: number): string {
  return `${depth.toLocaleString('en-IN')} m`;
}

export function toCsv(
  levels: ProfileLevel[],
  meta: Record<string, string | number>,
): string {
  const header = Object.entries(meta)
    .map(([key, value]) => `# ${key}: ${value}`)
    .join('\n');

  const rows = levels
    .map(({ depth, temp }) => `${depth},${temp.toFixed(4)}`)
    .join('\n');

  return `${header}\ndepth_m,temperature_degC\n${rows}\n`;
}
