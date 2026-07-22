/**
 * Tobler's hiking function: walking speed as a function of slope.
 * Peaks at 6 km/h on a gentle 5% downhill (tan(theta) = -0.05), the fastest
 * pace the function ever predicts — used as the A* admissible-heuristic bound.
 */
export const MAX_SPEED_KMH = 6

export function toblerSpeedKmh(grade: number): number {
  return MAX_SPEED_KMH * Math.exp(-3.5 * Math.abs(grade + 0.05))
}

/** Predicted walking time in seconds to cover distanceM at the given grade. */
export function toblerCostSeconds(distanceM: number, grade: number): number {
  const speedKmh = toblerSpeedKmh(grade)
  const speedMPerS = (speedKmh * 1000) / 3600
  return distanceM / speedMPerS
}
