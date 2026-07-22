import type { IncomingMessage, ServerResponse } from 'node:http'
import { getCityConfig, loadCityGraphData } from './_lib/cities.ts'
import { geocodeAddress } from './_lib/geocodeClient.ts'
import type { GeocodeResponse } from './_lib/types.ts'

interface GeocodeRequestBody {
  query?: unknown
  cityId?: unknown
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

  const body = (req.body ?? {}) as GeocodeRequestBody
  const query = typeof body.query === 'string' ? body.query.trim() : ''
  const cityId = typeof body.cityId === 'string' ? body.cityId : 'lisbon'

  if (query.length < 2) {
    sendJson(res, 400, { error: 'query_too_short' })
    return
  }

  const cityConfig = getCityConfig(cityId)
  if (!cityConfig) {
    sendJson(res, 400, { error: 'unknown_city' })
    return
  }

  let bbox: [number, number, number, number]
  try {
    bbox = loadCityGraphData(cityConfig).bbox
  } catch (err) {
    console.error('failed to load city graph data:', err)
    sendJson(res, 500, { error: 'internal_error' })
    return
  }

  try {
    const results = await geocodeAddress(query, bbox)
    const responseBody: GeocodeResponse = { results }
    sendJson(res, 200, responseBody)
  } catch (err) {
    console.error('geocode request failed:', err)
    sendJson(res, 502, { error: 'geocode_service_unavailable' })
  }
}
