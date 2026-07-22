import { describe, expect, it } from 'vitest'
import type { ParsedGraph } from './graph.js'
import { findPath } from './pathfinding.js'

/**
 * Diamond graph: node 0 (start) connects to node 3 (goal) two ways —
 * via node 1, a short but steep detour (costs more time despite less
 * distance), or via node 2, a longer but flat detour (costs less time).
 * A time-minimizing router should prefer the flat, longer route.
 */
function diamondGraph(): ParsedGraph {
  return {
    nodeCount: 4,
    lat: Float64Array.from([0, 0, 0, 0]),
    lon: Float64Array.from([0, 0, 0, 0]),
    elevation: Float64Array.from([0, 50, 0, 0]),
    edgeTo: Int32Array.from([1, 2, 0, 3, 0, 3, 1, 2]),
    edgeDistanceM: Float64Array.from([50, 150, 50, 50, 150, 150, 50, 150]),
    edgeCostS: Float64Array.from([100, 90, 100, 100, 90, 90, 100, 90]),
    nodeEdgeStart: Int32Array.from([0, 2, 4, 6, 8]),
  }
}

/**
 * Triangle graph where the direct edge is genuinely the cheapest option,
 * confirming the router doesn't just favor detours indiscriminately.
 */
function triangleGraph(): ParsedGraph {
  return {
    nodeCount: 3,
    lat: Float64Array.from([0, 0, 0]),
    lon: Float64Array.from([0, 0, 0]),
    elevation: Float64Array.from([0, 0, 0]),
    edgeTo: Int32Array.from([1, 2, 0, 2, 0, 1]),
    edgeDistanceM: Float64Array.from([80, 150, 80, 80, 150, 80]),
    edgeCostS: Float64Array.from([8, 15, 8, 8, 15, 8]),
    nodeEdgeStart: Int32Array.from([0, 2, 4, 6]),
  }
}

/**
 * Same shape as diamondGraph but with real, distinct coordinates so the
 * haversine-based A* heuristic is actually exercised (a heuristic bug would
 * be invisible on an all-zero-coordinate fixture, where heuristic() is
 * always 0 and A* silently degrades to plain Dijkstra).
 */
function diamondGraphWithRealCoordinates(): ParsedGraph {
  return {
    nodeCount: 4,
    // node0 start, node1 steep-mid, node2 flat-mid, node3 goal — roughly
    // matching diamondGraph's edge distances (~50m and ~150m hops).
    lat: Float64Array.from([38.71, 38.7104, 38.71, 38.7104]),
    lon: Float64Array.from([-9.14, -9.14, -9.1417, -9.1417]),
    elevation: Float64Array.from([0, 50, 0, 0]),
    edgeTo: Int32Array.from([1, 2, 0, 3, 0, 3, 1, 2]),
    edgeDistanceM: Float64Array.from([50, 150, 50, 50, 150, 150, 50, 150]),
    edgeCostS: Float64Array.from([100, 90, 100, 100, 90, 90, 100, 90]),
    nodeEdgeStart: Int32Array.from([0, 2, 4, 6, 8]),
  }
}

describe('findPath', () => {
  it('prefers the longer, flatter detour when it costs less predicted time', () => {
    const result = findPath(diamondGraph(), 0, 3)
    expect(result).not.toBeNull()
    expect(result!.nodeIds).toEqual([0, 2, 3])
    expect(result!.distanceM).toBe(300)
    expect(result!.durationS).toBe(180)
    expect(result!.ascentM).toBe(0)
    expect(result!.descentM).toBe(0)
  })

  it('prefers the direct path when it is genuinely the lowest-cost option', () => {
    const result = findPath(triangleGraph(), 0, 2)
    expect(result).not.toBeNull()
    expect(result!.nodeIds).toEqual([0, 2])
    expect(result!.distanceM).toBe(150)
    expect(result!.durationS).toBe(15)
  })

  it('finds the same optimal path when real coordinates drive the A* heuristic', () => {
    const result = findPath(diamondGraphWithRealCoordinates(), 0, 3)
    expect(result).not.toBeNull()
    expect(result!.nodeIds).toEqual([0, 2, 3])
    expect(result!.distanceM).toBe(300)
    expect(result!.durationS).toBe(180)
  })

  it('returns a zero-cost single-node path when start equals goal', () => {
    const result = findPath(diamondGraph(), 0, 0)
    expect(result).toEqual({ nodeIds: [0], distanceM: 0, durationS: 0, ascentM: 0, descentM: 0 })
  })

  it('returns null when no path exists', () => {
    const graph: ParsedGraph = {
      nodeCount: 2,
      lat: Float64Array.from([0, 0]),
      lon: Float64Array.from([0, 0]),
      elevation: Float64Array.from([0, 0]),
      edgeTo: Int32Array.from([]),
      edgeDistanceM: Float64Array.from([]),
      edgeCostS: Float64Array.from([]),
      nodeEdgeStart: Int32Array.from([0, 0, 0]),
    }
    expect(findPath(graph, 0, 1)).toBeNull()
  })

  it('accumulates ascent and descent along the chosen path', () => {
    // Same shape as diamondGraph but make the steep route (via node 1) the cheaper one.
    const graph: ParsedGraph = {
      nodeCount: 4,
      lat: Float64Array.from([0, 0, 0, 0]),
      lon: Float64Array.from([0, 0, 0, 0]),
      elevation: Float64Array.from([0, 50, 5, 0]),
      edgeTo: Int32Array.from([1, 2, 0, 3, 0, 3, 1, 2]),
      edgeDistanceM: Float64Array.from([50, 150, 50, 50, 150, 150, 50, 150]),
      edgeCostS: Float64Array.from([80, 200, 80, 80, 200, 200, 80, 200]),
      nodeEdgeStart: Int32Array.from([0, 2, 4, 6, 8]),
    }
    const result = findPath(graph, 0, 3)
    expect(result!.nodeIds).toEqual([0, 1, 3])
    expect(result!.ascentM).toBe(50)
    expect(result!.descentM).toBe(50)
  })
})
