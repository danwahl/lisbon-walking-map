import { ROUTE_MODES, type RouteMode } from './routeModes.ts'
import type { GeocodeResult } from './api.ts'

export interface SharedRoute {
  origin: GeocodeResult
  destination: GeocodeResult
  mode: RouteMode
}

function parsePoint(params: URLSearchParams, latKey: string, lonKey: string, labelKey: string): GeocodeResult | null {
  const lat = Number(params.get(latKey))
  const lon = Number(params.get(lonKey))
  const label = params.get(labelKey)
  if (!label || !Number.isFinite(lat) || !Number.isFinite(lon)) return null
  return { label, lat, lon }
}

// Reads the origin/destination/mode a route link was shared with, e.g.
// "?olat=38.71&olon=-9.14&olabel=...&dlat=...&dlon=...&dlabel=...&mode=time".
// Returns null if the URL doesn't encode a complete, valid route.
export function parseSharedRoute(search: string): SharedRoute | null {
  const params = new URLSearchParams(search)
  const origin = parsePoint(params, 'olat', 'olon', 'olabel')
  const destination = parsePoint(params, 'dlat', 'dlon', 'dlabel')
  if (!origin || !destination) return null
  const modeParam = params.get('mode')
  const mode = ROUTE_MODES.includes(modeParam as RouteMode) ? (modeParam as RouteMode) : 'energy'
  return { origin, destination, mode }
}

export function buildShareUrl(
  pathname: string,
  origin: GeocodeResult,
  destination: GeocodeResult,
  mode: RouteMode,
): string {
  const params = new URLSearchParams()
  params.set('olat', origin.lat.toFixed(6))
  params.set('olon', origin.lon.toFixed(6))
  params.set('olabel', origin.label)
  params.set('dlat', destination.lat.toFixed(6))
  params.set('dlon', destination.lon.toFixed(6))
  params.set('dlabel', destination.label)
  params.set('mode', mode)
  return `${pathname}?${params.toString()}`
}
