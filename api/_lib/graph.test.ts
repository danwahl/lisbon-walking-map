import { describe, expect, it } from 'vitest'
import type { CityGraphData } from './types.ts'
import { getParsedGraph, parseGraph } from './graph.ts'

function validData(): CityGraphData {
  return {
    cityId: 'test',
    bbox: [-9.2, 38.7, -9.1, 38.8],
    generatedAt: '2026-01-01T00:00:00Z',
    nodes: { lat: [38.7, 38.71, 38.72], lon: [-9.14, -9.14, -9.14], elevation: [0, 10, 20] },
    edges: { from: [0, 1], to: [1, 2], distanceM: [100, 100], costS: [80, 80] },
    nodeEdgeStart: [0, 1, 2, 2],
  }
}

describe('parseGraph', () => {
  it('parses valid data into typed arrays', () => {
    const parsed = parseGraph(validData())
    expect(parsed.nodeCount).toBe(3)
    expect(Array.from(parsed.edgeTo)).toEqual([1, 2])
  })

  it('rejects mismatched node array lengths', () => {
    const data = validData()
    data.nodes.lon = [-9.14, -9.14]
    expect(() => parseGraph(data)).toThrow(/node array length mismatch/)
  })

  it('rejects mismatched edge array lengths', () => {
    const data = validData()
    data.edges.costS = [80]
    expect(() => parseGraph(data)).toThrow(/edge array length mismatch/)
  })

  it('rejects a nodeEdgeStart of the wrong length', () => {
    const data = validData()
    data.nodeEdgeStart = [0, 1, 2]
    expect(() => parseGraph(data)).toThrow(/nodeEdgeStart must have length/)
  })

  it('rejects a non-monotonic nodeEdgeStart', () => {
    const data = validData()
    data.nodeEdgeStart = [0, 2, 1, 2]
    expect(() => parseGraph(data)).toThrow(/non-decreasing/)
  })

  it('rejects an edge referencing an out-of-range node', () => {
    const data = validData()
    data.edges.to[0] = 99
    expect(() => parseGraph(data)).toThrow(/out-of-range node/)
  })

  it('rejects an edge whose position disagrees with its from-node range', () => {
    const data = validData()
    // Edge 0 claims from=1, but nodeEdgeStart says node 1's edges start at index 1, not 0.
    data.edges.from[0] = 1
    expect(() => parseGraph(data)).toThrow(/outside that node's nodeEdgeStart range/)
  })
})

describe('getParsedGraph', () => {
  it('returns a cached graph on repeated calls for the same cityId', () => {
    const first = getParsedGraph('cache-test-city', validData())
    const second = getParsedGraph('cache-test-city', validData())
    expect(second).toBe(first)
  })
})
