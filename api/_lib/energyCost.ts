import { computeGrade } from './grade.js'

/**
 * Metabolic cost of walking as a function of gradient, from Minetti, A. E.,
 * Moia, C., Roi, G. S., Susta, D., & Ferretti, G. (2002). Energy cost of
 * walking and running at extreme uphill and downhill slopes. Journal of
 * Applied Physiology, 93(3), 1039-1046. A 5th-order polynomial regression
 * (R² = 0.999) fit to treadmill VO2 measurements, valid for gradients in
 * [-0.45, 0.45] (the range actually tested) — extrapolating a 5th-order
 * polynomial beyond its fitted domain diverges fast, so inputs are clamped
 * here rather than passed through.
 */
export const MINETTI_MAX_GRADE = 0.45

/**
 * Energy cost of walking, in joules per kg of body mass per meter walked
 * along the slope. `gradient` is rise/run (tan of the incline angle), the
 * same convention `computeGrade` uses elsewhere in this codebase.
 */
export function walkingEnergyCostPerMeter(gradient: number): number {
  const i = Math.max(-MINETTI_MAX_GRADE, Math.min(MINETTI_MAX_GRADE, gradient))
  return 280.5 * i ** 5 - 58.7 * i ** 4 - 76.8 * i ** 3 + 51.9 * i ** 2 + 19.6 * i + 2.5
}

/** Total metabolic energy (J per kg body mass) to walk one edge of the given length and elevation change. */
export function edgeEnergyJPerKg(distanceM: number, elevationDeltaM: number): number {
  const grade = computeGrade(distanceM, elevationDeltaM)
  // `distanceM` is a planar (horizontal-run) edge length, as OSMnx computes it — the
  // same convention Tobler's function uses elsewhere in this codebase, since it's
  // calibrated against horizontal map distance. Minetti's Cw, though, is defined per
  // meter actually walked along the incline (treadmill belt distance), so it needs
  // the standard run-to-slope-distance correction: slope distance = run / cos(theta)
  // = run * sqrt(1 + tan(theta)^2) = run * sqrt(1 + grade^2).
  const slopeDistanceM = distanceM * Math.sqrt(1 + grade * grade)
  return walkingEnergyCostPerMeter(grade) * slopeDistanceM
}

// No API exposes real user body mass, so displayed calorie figures are
// explicitly framed as a reference-person estimate rather than personalized.
export const REFERENCE_BODY_MASS_KG = 70
const JOULES_PER_KCAL = 4184

export function joulesPerKgToKcal(energyJPerKg: number): number {
  return (energyJPerKg * REFERENCE_BODY_MASS_KG) / JOULES_PER_KCAL
}
