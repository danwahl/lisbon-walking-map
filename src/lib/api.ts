import type {
  GeocodeResponse,
  GeocodeResult,
  Route,
  RouteErrorCode,
  RouteErrorResponse,
  RouteResponse,
} from '../../api/_lib/types.ts'

export type { GeocodeResult, Route, RouteErrorCode }

export class RouteRequestError extends Error {
  code: RouteErrorCode | 'unknown_error'

  constructor(code: RouteErrorCode | 'unknown_error') {
    super(code)
    this.name = 'RouteRequestError'
    this.code = code
  }
}

export async function geocode(query: string): Promise<GeocodeResult[]> {
  const response = await fetch('/api/geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!response.ok) return []
  const data = (await response.json()) as GeocodeResponse
  return data.results
}

export async function getRoute(origin: GeocodeResult, destination: GeocodeResult): Promise<Route> {
  const response = await fetch('/api/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin: { lat: origin.lat, lon: origin.lon },
      destination: { lat: destination.lat, lon: destination.lon },
    }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as RouteErrorResponse | null
    throw new RouteRequestError(body?.error ?? 'unknown_error')
  }

  const data = (await response.json()) as RouteResponse
  return data.route
}
