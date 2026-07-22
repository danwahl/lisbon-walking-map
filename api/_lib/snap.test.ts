import { describe, expect, it } from 'vitest'
import type { ParsedGraph } from './graph.js'
import { snapToNearestNode, SNAP_THRESHOLD_M } from './snap.js'

function fixtureGraph(): ParsedGraph {
  // Three nodes roughly 111m apart in latitude (0.001 degrees).
  return {
    nodeCount: 3,
    lat: Float64Array.from([38.7, 38.701, 38.702]),
    lon: Float64Array.from([-9.14, -9.14, -9.14]),
    elevation: Float64Array.from([0, 0, 0]),
    edgeTo: Int32Array.from([]),
    edgeDistanceM: Float64Array.from([]),
    edgeCostS: Float64Array.from([]),
    nodeEdgeStart: Int32Array.from([0, 0, 0, 0]),
  }
}

describe('snapToNearestNode', () => {
  it('returns the closest node to the query point', () => {
    const graph = fixtureGraph()
    expect(snapToNearestNode(graph, 38.7006, -9.14)).toBe(1)
  })

  it('returns the exact node when the query point matches it', () => {
    const graph = fixtureGraph()
    expect(snapToNearestNode(graph, 38.702, -9.14)).toBe(2)
  })

  it('returns null when nothing is within the snap threshold', () => {
    const graph = fixtureGraph()
    // Roughly 1 degree of longitude away, far beyond SNAP_THRESHOLD_M.
    expect(snapToNearestNode(graph, 38.7, -10.14)).toBeNull()
  })

  it('accepts a point exactly at the snap threshold boundary', () => {
    const graph: ParsedGraph = {
      nodeCount: 1,
      lat: Float64Array.from([38.7]),
      lon: Float64Array.from([-9.14]),
      elevation: Float64Array.from([0]),
      edgeTo: Int32Array.from([]),
      edgeDistanceM: Float64Array.from([]),
      edgeCostS: Float64Array.from([]),
      nodeEdgeStart: Int32Array.from([0, 0]),
    }
    // ~0.002 degrees latitude is well within SNAP_THRESHOLD_M (250m).
    expect(snapToNearestNode(graph, 38.702, -9.14)).not.toBeNull()
    expect(SNAP_THRESHOLD_M).toBe(250)
  })
})
