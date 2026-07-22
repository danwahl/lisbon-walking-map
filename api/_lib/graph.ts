import type { CityGraphData } from './types.js'

export interface ParsedGraph {
  nodeCount: number
  lat: Float64Array
  lon: Float64Array
  elevation: Float64Array
  edgeTo: Int32Array
  edgeDistanceM: Float64Array
  edgeCostS: Float64Array
  nodeEdgeStart: Int32Array
}

/**
 * Validates internal consistency of raw graph JSON before it's trusted by the
 * router. Catches offline data-pipeline bugs at load time instead of letting
 * them surface as silently-wrong or NaN routes downstream.
 */
function validateGraphData(data: CityGraphData): void {
  const nodeCount = data.nodes.lat.length
  const edgeCount = data.edges.to.length

  if (data.nodes.lon.length !== nodeCount || data.nodes.elevation.length !== nodeCount) {
    throw new Error(
      `parseGraph: node array length mismatch (lat=${nodeCount}, lon=${data.nodes.lon.length}, elevation=${data.nodes.elevation.length})`,
    )
  }
  if (
    data.edges.from.length !== edgeCount ||
    data.edges.distanceM.length !== edgeCount ||
    data.edges.costS.length !== edgeCount
  ) {
    throw new Error(
      `parseGraph: edge array length mismatch (to=${edgeCount}, from=${data.edges.from.length}, distanceM=${data.edges.distanceM.length}, costS=${data.edges.costS.length})`,
    )
  }
  if (data.nodeEdgeStart.length !== nodeCount + 1) {
    throw new Error(
      `parseGraph: nodeEdgeStart must have length nodeCount+1 (${nodeCount + 1}), got ${data.nodeEdgeStart.length}`,
    )
  }
  for (let i = 0; i < data.nodeEdgeStart.length; i++) {
    if (data.nodeEdgeStart[i] < 0 || data.nodeEdgeStart[i] > edgeCount) {
      throw new Error(`parseGraph: nodeEdgeStart[${i}]=${data.nodeEdgeStart[i]} out of range [0, ${edgeCount}]`)
    }
    if (i > 0 && data.nodeEdgeStart[i] < data.nodeEdgeStart[i - 1]) {
      throw new Error(`parseGraph: nodeEdgeStart must be non-decreasing, violated at index ${i}`)
    }
  }
  for (let e = 0; e < edgeCount; e++) {
    const from = data.edges.from[e]
    if (from < 0 || from >= nodeCount || data.edges.to[e] < 0 || data.edges.to[e] >= nodeCount) {
      throw new Error(`parseGraph: edge ${e} references an out-of-range node (from=${from}, to=${data.edges.to[e]})`)
    }
    if (e < data.nodeEdgeStart[from] || e >= data.nodeEdgeStart[from + 1]) {
      throw new Error(`parseGraph: edge ${e} has from=${from} but falls outside that node's nodeEdgeStart range`)
    }
  }
}

/** Parses raw JSON graph data into typed arrays for fast repeated use across warm invocations. */
export function parseGraph(data: CityGraphData): ParsedGraph {
  validateGraphData(data)
  return {
    nodeCount: data.nodes.lat.length,
    lat: Float64Array.from(data.nodes.lat),
    lon: Float64Array.from(data.nodes.lon),
    elevation: Float64Array.from(data.nodes.elevation),
    edgeTo: Int32Array.from(data.edges.to),
    edgeDistanceM: Float64Array.from(data.edges.distanceM),
    edgeCostS: Float64Array.from(data.edges.costS),
    nodeEdgeStart: Int32Array.from(data.nodeEdgeStart),
  }
}

const parsedGraphCache = new Map<string, ParsedGraph>()

/**
 * Caches by cityId only — assumes each city's data is a static, statically
 * imported JSON module that never changes within a process, matching how
 * the graph is bundled per-request in `api/route.ts`. Not a general-purpose
 * cache: a second call for the same cityId with different data is ignored.
 */
export function getParsedGraph(cityId: string, data: CityGraphData): ParsedGraph {
  const cached = parsedGraphCache.get(cityId)
  if (cached) return cached
  const parsed = parseGraph(data)
  parsedGraphCache.set(cityId, parsed)
  return parsed
}
