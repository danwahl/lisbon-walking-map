import { describe, expect, it } from 'vitest'
import { computeGrade, MAX_ABS_GRADE } from './grade.ts'

describe('computeGrade', () => {
  it('computes rise over run for an uphill segment', () => {
    expect(computeGrade(100, 10)).toBeCloseTo(0.1, 10)
  })

  it('computes a negative grade for a downhill segment', () => {
    expect(computeGrade(100, -10)).toBeCloseTo(-0.1, 10)
  })

  it('is zero for a perfectly flat segment', () => {
    expect(computeGrade(100, 0)).toBe(0)
  })

  it('treats zero horizontal distance as flat rather than dividing by zero', () => {
    expect(computeGrade(0, 10)).toBe(0)
  })

  it('treats a negative distance as flat rather than producing a negated grade', () => {
    expect(computeGrade(-100, 10)).toBe(0)
  })

  it('clamps an implausible grade from a tiny distance with noisy elevation data', () => {
    // 8m of elevation change over 1.5m of distance is DEM sampling noise, not a real slope.
    expect(computeGrade(1.5, 8)).toBe(MAX_ABS_GRADE)
    expect(computeGrade(1.5, -8)).toBe(-MAX_ABS_GRADE)
  })
})
