import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CityGraphData } from './types.ts'

const moduleDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(moduleDir, '../..')

export interface CityConfig {
  id: string
  name: string
  dataPath: string
}

/**
 * Adding a new city: rerun data-prep/build_graph.py with a new bbox, then
 * add one entry here pointing at the resulting JSON file. No other code
 * changes needed.
 */
// A Map (rather than a plain object) avoids returning inherited properties
// like "constructor" or "toString" as if they were valid registry entries.
const CITY_REGISTRY = new Map<string, CityConfig>([
  [
    'lisbon',
    {
      id: 'lisbon',
      name: 'Lisbon',
      // Overridable so tests/e2e can point the route handler at a tiny fixture
      // graph instead of the full precomputed dataset.
      dataPath: process.env.LISBON_GRAPH_PATH
        ? path.resolve(repoRoot, process.env.LISBON_GRAPH_PATH)
        : path.join(repoRoot, 'data/cities/lisbon.json'),
    },
  ],
])

export function getCityConfig(cityId: string): CityConfig | null {
  return CITY_REGISTRY.get(cityId) ?? null
}

const rawDataCache = new Map<string, CityGraphData>()

/** Reads and caches a city's graph JSON from disk, keyed by resolved file path. */
export function loadCityGraphData(config: CityConfig): CityGraphData {
  const cached = rawDataCache.get(config.dataPath)
  if (cached) return cached
  const raw = readFileSync(config.dataPath, 'utf-8')
  const data = JSON.parse(raw) as CityGraphData
  rawDataCache.set(config.dataPath, data)
  return data
}
