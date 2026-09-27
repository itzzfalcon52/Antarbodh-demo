/**
 * Square-root depth stretch shared by the landing depth gauge and the
 * prediction profile chart. On a linear 0–1000 m axis the five upper
 * ocean levels (0–30 m) collapse into the top 3%; a square-root axis
 * gives them room while keeping depth order intact.
 */
export function depthFraction(depth: number, maxDepth = 1000): number {
  return Math.sqrt(Math.max(0, Math.min(depth, maxDepth)) / maxDepth);
}

/** Tick depths that read well on the stretched axis. */
export const DEPTH_AXIS_TICKS = [0, 10, 50, 100, 200, 500, 1000];
