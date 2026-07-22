import type { ParsedGraph } from './graph.ts'
import { haversineMeters } from './geo.ts'
import { MinHeap } from './minHeap.ts'
import { MAX_SPEED_KMH } from './tobler.ts'

// Tobler's function never predicts a speed above MAX_SPEED_KMH, so
// haversine-distance * this factor is a true lower bound on time cost —
// the admissibility A* needs to guarantee an optimal path.
const SECONDS_PER_METER_AT_MAX_SPEED = 3600 / (MAX_SPEED_KMH * 1000)

export interface PathResult {
  nodeIds: number[]
  distanceM: number
  durationS: number
  ascentM: number
  descentM: number
}

/** A* shortest-time path between two node ids in an already-parsed graph. Returns null if unreachable. */
export function findPath(graph: ParsedGraph, startNode: number, goalNode: number): PathResult | null {
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
    return { nodeIds: [startNode], distanceM: 0, durationS: 0, ascentM: 0, descentM: 0 }
  }

  const gScore = new Float64Array(nodeCount).fill(Infinity)
  const cameFromNode = new Int32Array(nodeCount).fill(-1)
  const cameFromEdge = new Int32Array(nodeCount).fill(-1)
  const closed = new Uint8Array(nodeCount)

  const heuristic = (node: number) =>
    haversineMeters(lat[node], lon[node], lat[goalNode], lon[goalNode]) * SECONDS_PER_METER_AT_MAX_SPEED

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
      const tentativeG = gScore[node] + edgeCostS[e]
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
  let ascentM = 0
  let descentM = 0
  let cur = goalNode
  while (cur !== startNode) {
    const edge = cameFromEdge[cur]
    const prev = cameFromNode[cur]
    nodeIds.push(cur)
    distanceM += edgeDistanceM[edge]
    const delta = elevation[cur] - elevation[prev]
    if (delta > 0) ascentM += delta
    else descentM -= delta
    cur = prev
  }
  nodeIds.push(startNode)
  nodeIds.reverse()

  return { nodeIds, distanceM, durationS: gScore[goalNode], ascentM, descentM }
}
