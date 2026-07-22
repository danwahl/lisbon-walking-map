import type { ParsedGraph } from './graph.ts'
import { haversineMeters } from './geo.ts'

export const SNAP_THRESHOLD_M = 250

/** Nearest graph node to (lat, lon), or null if nothing is within SNAP_THRESHOLD_M. */
export function snapToNearestNode(graph: ParsedGraph, lat: number, lon: number): number | null {
  let bestNode = -1
  let bestDistance = Infinity
  for (let i = 0; i < graph.nodeCount; i++) {
    const distance = haversineMeters(lat, lon, graph.lat[i], graph.lon[i])
    if (distance < bestDistance) {
      bestDistance = distance
      bestNode = i
    }
  }
  if (bestNode === -1 || bestDistance > SNAP_THRESHOLD_M) return null
  return bestNode
}
