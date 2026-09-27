/**
 * The temperature scale drawn on the Explore map. It is the single
 * source for the map layer, the map legend and the profile chart on
 * the same page, so a colour always means the same temperature.
 * (ColorBrewer RdYlBu, 0–32 °C; unchanged from the original layer.)
 */
export const TEMPERATURE_STOPS: [number, string][] = [
  [0, '#313695'],
  [4, '#4575b4'],
  [8, '#74add1'],
  [12, '#abd9e9'],
  [16, '#e0f3f8'],
  [20, '#fee090'],
  [24, '#fdae61'],
  [28, '#f46d43'],
  [32, '#d73027'],
];

export const TEMPERATURE_MIN = TEMPERATURE_STOPS[0][0];
export const TEMPERATURE_MAX = TEMPERATURE_STOPS[TEMPERATURE_STOPS.length - 1][0];

const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Same linear interpolation MapLibre applies to the fill layer. */
export function mapTemperatureColor(temp: number): string {
  const stops = TEMPERATURE_STOPS;
  if (temp <= stops[0][0]) return stops[0][1];

  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];

    if (temp <= t1) {
      const k = (temp - t0) / (t1 - t0);
      const a = toRgb(c0);
      const b = toRgb(c1);
      const [r, g, bl] = a.map((v, j) => Math.round(v + (b[j] - v) * k));
      return `rgb(${r}, ${g}, ${bl})`;
    }
  }

  return stops[stops.length - 1][1];
}

/** CSS gradient of the scale, left (cold) to right (warm). */
export const TEMPERATURE_GRADIENT = `linear-gradient(to right, ${TEMPERATURE_STOPS.map(
  ([t, c]) => `${c} ${((t - TEMPERATURE_MIN) / (TEMPERATURE_MAX - TEMPERATURE_MIN)) * 100}%`,
).join(', ')})`;
