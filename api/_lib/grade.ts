/**
 * No real street (even Lisbon's steepest calçadas) sustains a grade beyond
 * this. Clamping guards against DEM sampling noise: on very short edges
 * (a couple meters), adjacent raster pixels can disagree by several meters
 * of elevation, implying an impossible near-vertical slope that would
 * otherwise blow up Tobler's cost function toward absurd values.
 */
export const MAX_ABS_GRADE = 1.5

/**
 * Slope as tan(theta) = rise / run, the form Tobler's hiking function expects.
 * Zero (or negative) horizontal distance has no defined slope; treat it as flat.
 */
export function computeGrade(distanceM: number, elevationDeltaM: number): number {
  if (distanceM <= 0) return 0
  const grade = elevationDeltaM / distanceM
  return Math.max(-MAX_ABS_GRADE, Math.min(MAX_ABS_GRADE, grade))
}
