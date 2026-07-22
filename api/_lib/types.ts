export interface LatLon {
  lat: number
  lon: number
}

export interface GeocodeResult {
  label: string
  lat: number
  lon: number
}

export interface GeocodeResponse {
  results: GeocodeResult[]
}

export interface RouteRequest {
  origin: LatLon
  destination: LatLon
  cityId?: string
}

export type RouteMode = 'distance' | 'time' | 'climb' | 'energy'

export interface Route {
  coordinates: [number, number][]
  distanceM: number
  durationS: number
  ascentM: number
  descentM: number
  energyKcal: number
}

export interface RouteResponse {
  routes: Record<RouteMode, Route>
}

export type RouteErrorCode =
  | 'method_not_allowed'
  | 'invalid_request'
  | 'unknown_city'
  | 'outside_coverage'
  | 'no_nearby_path'
  | 'no_route'
  | 'internal_error'

export interface RouteErrorResponse {
  error: RouteErrorCode
}

export interface CityGraphData {
  cityId: string
  bbox: [number, number, number, number]
  generatedAt: string
  nodes: {
    lat: number[]
    lon: number[]
    elevation: number[]
  }
  edges: {
    from: number[]
    to: number[]
    distanceM: number[]
    costS: number[]
  }
  nodeEdgeStart: number[]
}
