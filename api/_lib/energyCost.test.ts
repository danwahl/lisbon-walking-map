import { describe, expect, it } from 'vitest'
import { edgeEnergyJPerKg, MINETTI_MAX_GRADE, walkingEnergyCostPerMeter } from './energyCost.js'

describe('walkingEnergyCostPerMeter', () => {
  it('equals the y-intercept exactly on flat ground', () => {
    expect(walkingEnergyCostPerMeter(0)).toBe(2.5)
  })

  it('matches the reference value at +0.45 grade reported in Minetti et al. (2002), Table 2', () => {
    // Paper reports a measured minimum Cw of 17.33 +/- 1.11 J/kg/m at slope +0.45.
    expect(walkingEnergyCostPerMeter(0.45)).toBeCloseTo(17.33, 0)
  })

  it('is cheaper on a gentle downhill than on flat ground, and flat is cheaper than a steep climb', () => {
    const gentleDownhill = walkingEnergyCostPerMeter(-0.1)
    const flat = walkingEnergyCostPerMeter(0)
    const steepUphill = walkingEnergyCostPerMeter(0.45)
    expect(gentleDownhill).toBeLessThan(flat)
    expect(flat).toBeLessThan(steepUphill)
  })

  it('clamps grades beyond the fitted [-0.45, 0.45] range instead of extrapolating', () => {
    expect(walkingEnergyCostPerMeter(10)).toBe(walkingEnergyCostPerMeter(MINETTI_MAX_GRADE))
    expect(walkingEnergyCostPerMeter(-10)).toBe(walkingEnergyCostPerMeter(-MINETTI_MAX_GRADE))
  })
})

describe('edgeEnergyJPerKg', () => {
  it('is zero for a zero-distance edge', () => {
    expect(edgeEnergyJPerKg(0, 5)).toBe(0)
  })

  it('scales with distance at a fixed grade', () => {
    const per100m = edgeEnergyJPerKg(100, 10)
    const per200m = edgeEnergyJPerKg(200, 20)
    expect(per200m).toBeCloseTo(per100m * 2, 6)
  })

  it('costs more for a steep climb than a flat segment of the same distance', () => {
    expect(edgeEnergyJPerKg(100, 30)).toBeGreaterThan(edgeEnergyJPerKg(100, 0))
  })

  it('accounts for the extra distance actually walked along a slope, not just horizontal run', () => {
    const distanceM = 100
    const elevationDeltaM = 45 // grade = 0.45, right at the fitted-range boundary
    const naiveEnergy = walkingEnergyCostPerMeter(0.45) * distanceM
    const actualEnergy = edgeEnergyJPerKg(distanceM, elevationDeltaM)
    expect(actualEnergy).toBeCloseTo(naiveEnergy * Math.sqrt(1 + 0.45 ** 2), 6)
    expect(actualEnergy).toBeGreaterThan(naiveEnergy)
  })
})
