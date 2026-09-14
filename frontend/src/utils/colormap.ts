import { interpolateRgb } from 'd3-interpolate'
import { scaleLinear } from 'd3-scale'

/**
 * AntarBodh 5-Stop Thermal Colormap
 * Functional colormap for ocean temperature data:
 * #1E3A8A (deep blue) -> #2E8FB0 (cyan-teal) -> #E8D95C (yellow) -> #E8642F (signal orange) -> #B23A2E (deep red)
 */
export const THERMAL_STOPS = [
  '#1E3A8A',
  '#2E8FB0',
  '#E8D95C',
  '#E8642F',
  '#B23A2E'
]

export function createThermalScale(minTemp: number, maxTemp: number) {
  // Ensure valid domain
  const safeMin = Number.isFinite(minTemp) ? minTemp : 5.0
  const safeMax = Number.isFinite(maxTemp) && maxTemp > safeMin ? maxTemp : safeMin + 25.0
  const span = safeMax - safeMin

  const domain = [
    safeMin,
    safeMin + span * 0.25,
    safeMin + span * 0.50,
    safeMin + span * 0.75,
    safeMax
  ]

  const scale = scaleLinear<string>()
    .domain(domain)
    .range(THERMAL_STOPS)
    .interpolate(interpolateRgb)
    .clamp(true)

  return scale
}

/**
 * Returns an RGB array [r, g, b, a] for high-performance canvas pixel manipulation
 */
export function getThermalRgba(val: number | null | undefined, minTemp: number, maxTemp: number): [number, number, number, number] {
  if (val === null || val === undefined || isNaN(val)) {
    return [0, 0, 0, 0] // Transparent / no data
  }

  const safeMin = Number.isFinite(minTemp) ? minTemp : 5.0
  const safeMax = Number.isFinite(maxTemp) && maxTemp > safeMin ? maxTemp : safeMin + 25.0
  const norm = Math.max(0, Math.min(1, (val - safeMin) / (safeMax - safeMin)))

  // 5 stops: 0, 0.25, 0.5, 0.75, 1.0
  const colors = [
    [30, 58, 138],    // #1E3A8A
    [46, 143, 176],   // #2E8FB0
    [232, 217, 92],   // #E8D95C
    [232, 100, 47],   // #E8642F
    [178, 58, 46]     // #B23A2E
  ]

  const idx = norm * 4
  const lower = Math.floor(idx)
  const upper = Math.min(4, Math.ceil(idx))
  const frac = idx - lower

  const c1 = colors[lower]
  const c2 = colors[upper]

  const r = Math.round(c1[0] + frac * (c2[0] - c1[0]))
  const g = Math.round(c1[1] + frac * (c2[1] - c1[1]))
  const b = Math.round(c1[2] + frac * (c2[2] - c1[2]))

  return [r, g, b, 240] // 240 alpha
}
