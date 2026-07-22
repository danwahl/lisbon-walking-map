import type { GeocodeResult } from './types.js'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'lisbon-walking-map (https://github.com/danwahl/lisbon-walking-map)'
const MIN_REQUEST_INTERVAL_MS = 1000
const REQUEST_TIMEOUT_MS = 5000
const RESULT_LIMIT = 5

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
}

let nextAvailableAt = 0

/**
 * Reserves the next allowed request slot synchronously (no `await` between
 * reading and writing `nextAvailableAt`), so concurrent calls within one
 * warm instance serialize against each other instead of racing on a stale
 * read and firing at nearly the same instant.
 */
async function rateGate(): Promise<void> {
  const now = Date.now()
  const scheduledAt = Math.max(now, nextAvailableAt)
  nextAvailableAt = scheduledAt + MIN_REQUEST_INTERVAL_MS
  const delay = scheduledAt - now
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay))
  }
}

/**
 * Geocodes a free-text query via Nominatim, restricted to and filtered by
 * the given bbox. Best-effort rate limiting only holds within one warm
 * serverless instance — see README for the known limitation at scale.
 */
export async function geocodeAddress(
  query: string,
  bbox: [number, number, number, number],
): Promise<GeocodeResult[]> {
  await rateGate()

  const [minLon, minLat, maxLon, maxLat] = bbox
  const url = new URL(NOMINATIM_URL)
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', String(RESULT_LIMIT))
  url.searchParams.set('viewbox', `${minLon},${maxLat},${maxLon},${minLat}`)
  url.searchParams.set('bounded', '1')

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`Nominatim request failed: ${response.status}`)
  }

  const results = (await response.json()) as NominatimResult[]

  return results
    .map((r) => ({ label: r.display_name, lat: Number(r.lat), lon: Number(r.lon) }))
    .filter((r) => r.lon >= minLon && r.lon <= maxLon && r.lat >= minLat && r.lat <= maxLat)
}
