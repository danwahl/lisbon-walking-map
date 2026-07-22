import type { ParsedGraph } from './graph.js'
import { computeGrade } from './grade.js'
import { edgeEnergyJPerKg, joulesPerKgToKcal } from './energyCost.js'
import { haversineMeters } from './geo.js'
import { MinHeap } from './minHeap.js'
import { MAX_SPEED_KMH } from './tobler.js'
import type { RouteMode } from './types.js'

// Tobler's function never predicts a speed above MAX_SPEED_KMH, so
// haversine-distance * this factor is a true lower bound on time cost —
// the admissibility A* needs to guarantee an optimal path.
const SECONDS_PER_METER_AT_MAX_SPEED = 3600 / (MAX_SPEED_KMH * 1000)

// For 'climb' mode: how many meters of extra walking are "worth" avoiding
// one meter of climb. Large enough that any realistic detour still favors
// less climbing, but not so large that it ignores distance entirely once
// climb is already minimized. Unlike 'energy' mode, this trade-off is a
// hand-picked constant, not derived from a physiological cost model.
export const CLIMB_DISTANCE_PENALTY_M_PER_M = 20

export interface PathResult {
  nodeIds: number[]
  distanceM: number
  durationS: number
  ascentM: number
  descentM: number
  energyKcal: number
}

/** A* shortest path between two node ids in an already-parsed graph, optimizing for `mode`. Returns null if unreachable. */
export function findPath(
  graph: ParsedGraph,
  startNode: number,
  goalNode: number,
  mode: RouteMode = 'energy',
): PathResult | null {
  const { nodeCount, lat, lon, elevation, edgeTo, edgeDistanceM, edgeCostS, nodeEdgeStart } = graph

  if (
    !Number.isInteger(startNode) ||
    !Number.isInteger(goalNode) ||
    startNode < 0 ||
    startNode >= nodeCount ||
    goalNode < 0 ||
    goalNode >= nodeCount
  ) {
    throw new RangeError(
      `findPath: node ids must be integers in [0, ${nodeCount}); got startNode=${startNode}, goalNode=${goalNode}`,
    )
  }

  if (startNode === goalNode) {
    return { nodeIds: [startNode], distanceM: 0, durationS: 0, ascentM: 0, descentM: 0, energyKcal: 0 }
  }

  // Edge weight for the search's priority ordering — what each mode optimizes for.
  // Route stats (distance/duration/ascent/descent/energy) are always the path's
  // real physical values, computed separately below regardless of which weight won.
  const edgeWeight = (edgeIndex: number, fromNode: number): number => {
    if (mode === 'distance') return edgeDistanceM[edgeIndex]
    if (mode === 'climb') {
      const toNode = edgeTo[edgeIndex]
      const distance = edgeDistanceM[edgeIndex]
      // Same grade clamp used to precompute edgeCostS: on very short edges, DEM
      // sampling noise between adjacent pixels can imply an impossible near-vertical
      // slope, which would otherwise blow this weight up to an absurd value.
      const clampedElevationDelta = computeGrade(distance, elevation[toNode] - elevation[fromNode]) * distance
      const ascent = Math.max(0, clampedElevationDelta)
      return distance + ascent * CLIMB_DISTANCE_PENALTY_M_PER_M
    }
    if (mode === 'energy') {
      const toNode = edgeTo[edgeIndex]
      return edgeEnergyJPerKg(edgeDistanceM[edgeIndex], elevation[toNode] - elevation[fromNode])
    }
    return edgeCostS[edgeIndex]
  }

  // Each heuristic must be a true lower bound on `edgeWeight` summed along any
  // path, or A* can return a suboptimal route.
  const heuristic = (node: number): number => {
    const distanceToGoal = haversineMeters(lat[node], lon[node], lat[goalNode], lon[goalNode])
    if (mode === 'distance') return distanceToGoal
    if (mode === 'climb' || mode === 'energy') return 0
    return distanceToGoal * SECONDS_PER_METER_AT_MAX_SPEED
  }

  const gScore = new Float64Array(nodeCount).fill(Infinity)
  const cameFromNode = new Int32Array(nodeCount).fill(-1)
  const cameFromEdge = new Int32Array(nodeCount).fill(-1)
  const closed = new Uint8Array(nodeCount)

  gScore[startNode] = 0
  const open = new MinHeap<number>()
  open.push(heuristic(startNode), startNode)

  while (open.size > 0) {
    const node = open.pop()!
    if (closed[node]) continue
    if (node === goalNode) break
    closed[node] = 1

    const edgeStart = nodeEdgeStart[node]
    const edgeEnd = nodeEdgeStart[node + 1]
    for (let e = edgeStart; e < edgeEnd; e++) {
      const neighbor = edgeTo[e]
      if (closed[neighbor]) continue
      const tentativeG = gScore[node] + edgeWeight(e, node)
      if (tentativeG < gScore[neighbor]) {
        gScore[neighbor] = tentativeG
        cameFromNode[neighbor] = node
        cameFromEdge[neighbor] = e
        open.push(tentativeG + heuristic(neighbor), neighbor)
      }
    }
  }

  if (gScore[goalNode] === Infinity) return null

  const nodeIds: number[] = []
  let distanceM = 0
  let durationS = 0
  let ascentM = 0
  let descentM = 0
  let energyJPerKg = 0
  let cur = goalNode
  while (cur !== startNode) {
    const edge = cameFromEdge[cur]
    const prev = cameFromNode[cur]
    nodeIds.push(cur)
    distanceM += edgeDistanceM[edge]
    durationS += edgeCostS[edge]
    const delta = elevation[cur] - elevation[prev]
    if (delta > 0) ascentM += delta
    else descentM -= delta
    energyJPerKg += edgeEnergyJPerKg(edgeDistanceM[edge], delta)
    cur = prev
  }
  nodeIds.push(startNode)
  nodeIds.reverse()

  return { nodeIds, distanceM, durationS, ascentM, descentM, energyKcal: joulesPerKgToKcal(energyJPerKg) }
}
