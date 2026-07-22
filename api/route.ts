import type { IncomingMessage, ServerResponse } from 'node:http'
import { getCityConfig, loadCityGraphData } from './_lib/cities.js'
import { getParsedGraph } from './_lib/graph.js'
import { findPath, type PathResult } from './_lib/pathfinding.js'
import { snapToNearestNode } from './_lib/snap.js'
import type { LatLon, Route, RouteMode, RouteResponse } from './_lib/types.js'

function toRoute(path: PathResult, graph: { lat: Float64Array; lon: Float64Array }): Route {
  return {
    coordinates: path.nodeIds.map((nodeId) => [graph.lat[nodeId], graph.lon[nodeId]]),
    distanceM: path.distanceM,
    durationS: path.durationS,
    ascentM: path.ascentM,
    descentM: path.descentM,
    energyKcal: path.energyKcal,
  }
}

interface RouteRequestBody {
  origin?: unknown
  destination?: unknown
  cityId?: unknown
}

function isLatLon(value: unknown): value is LatLon {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.lat === 'number' && typeof v.lon === 'number' && Number.isFinite(v.lat) && Number.isFinite(v.lon)
}

function isWithinBbox(point: LatLon, bbox: [number, number, number, number]): boolean {
  const [minLon, minLat, maxLon, maxLat] = bbox
  return point.lon >= minLon && point.lon <= maxLon && point.lat >= minLat && point.lat <= maxLat
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'method_not_allowed' })
    return
  }

  const body = (req.body ?? {}) as RouteRequestBody
  const cityId = typeof body.cityId === 'string' ? body.cityId : 'lisbon'

  if (!isLatLon(body.origin) || !isLatLon(body.destination)) {
    sendJson(res, 400, { error: 'invalid_request' })
    return
  }
  const origin = body.origin
  const destination = body.destination

  const cityConfig = getCityConfig(cityId)
  if (!cityConfig) {
    sendJson(res, 400, { error: 'unknown_city' })
    return
  }

  try {
    const graphData = loadCityGraphData(cityConfig)

    if (!isWithinBbox(origin, graphData.bbox) || !isWithinBbox(destination, graphData.bbox)) {
      sendJson(res, 422, { error: 'outside_coverage' })
      return
    }

    const graph = getParsedGraph(cityConfig.id, graphData)

    const startNode = snapToNearestNode(graph, origin.lat, origin.lon)
    const goalNode = snapToNearestNode(graph, destination.lat, destination.lon)
    if (startNode === null || goalNode === null) {
      sendJson(res, 422, { error: 'no_nearby_path' })
      return
    }

    // Edge weights are all non-negative and validated finite at parse time
    // (see graph.ts), so graph connectivity — and thus reachability — is
    // identical across modes; checking one covers all four.
    const distancePath = findPath(graph, startNode, goalNode, 'distance')
    if (distancePath === null) {
      sendJson(res, 404, { error: 'no_route' })
      return
    }
    const timePath = findPath(graph, startNode, goalNode, 'time')!
    const climbPath = findPath(graph, startNode, goalNode, 'climb')!
    const energyPath = findPath(graph, startNode, goalNode, 'energy')!

    const routes: Record<RouteMode, Route> = {
      distance: toRoute(distancePath, graph),
      time: toRoute(timePath, graph),
      climb: toRoute(climbPath, graph),
      energy: toRoute(energyPath, graph),
    }

    const responseBody: RouteResponse = { routes }
    sendJson(res, 200, responseBody)
  } catch (err) {
    console.error('route handler failed:', err)
    sendJson(res, 500, { error: 'internal_error' })
  }
}
