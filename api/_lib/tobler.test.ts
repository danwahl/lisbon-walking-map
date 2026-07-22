import { describe, expect, it } from 'vitest'
import { MAX_SPEED_KMH, toblerCostSeconds, toblerSpeedKmh } from './tobler.js'

describe('toblerSpeedKmh', () => {
  it('peaks at MAX_SPEED_KMH on a gentle 5% downhill', () => {
    expect(toblerSpeedKmh(-0.05)).toBeCloseTo(MAX_SPEED_KMH, 10)
  })

  it('is slower on flat ground than at the downhill peak', () => {
    expect(toblerSpeedKmh(0)).toBeLessThan(MAX_SPEED_KMH)
    expect(toblerSpeedKmh(0)).toBeCloseTo(5.0367, 3)
  })

  it('is slower going uphill than flat', () => {
    expect(toblerSpeedKmh(0.3)).toBeLessThan(toblerSpeedKmh(0))
  })

  it('is slower on a steep downhill than the gentle-downhill peak', () => {
    expect(toblerSpeedKmh(-0.4)).toBeLessThan(toblerSpeedKmh(-0.05))
  })

  it('never predicts a speed above MAX_SPEED_KMH for any grade', () => {
    for (const grade of [-1, -0.5, -0.05, 0, 0.1, 0.5, 1]) {
      expect(toblerSpeedKmh(grade)).toBeLessThanOrEqual(MAX_SPEED_KMH + 1e-9)
    }
  })
})

describe('toblerCostSeconds', () => {
  it('scales linearly with distance at a fixed grade', () => {
    const costPer100m = toblerCostSeconds(100, 0.1)
    const costPer200m = toblerCostSeconds(200, 0.1)
    expect(costPer200m).toBeCloseTo(costPer100m * 2, 6)
  })

  it('costs more for a steep climb than a flat segment of the same distance', () => {
    expect(toblerCostSeconds(100, 0.3)).toBeGreaterThan(toblerCostSeconds(100, 0))
  })
})
