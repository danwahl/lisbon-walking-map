import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseGraph } from '../../api/_lib/graph.ts'
import { findPath } from '../../api/_lib/pathfinding.ts'
import { snapToNearestNode } from '../../api/_lib/snap.ts'
import type { CityGraphData } from '../../api/_lib/types.ts'

const fixturePath = new URL('./lisbon-mini.json', import.meta.url)
const data = JSON.parse(readFileSync(fixturePath, 'utf-8')) as CityGraphData

describe('lisbon-mini e2e fixture', () => {
  it('parses as a valid graph', () => {
    expect(() => parseGraph(data)).not.toThrow()
  })

  it('routes from Praça do Comércio to Rossio via the flatter, longer path', () => {
    const graph = parseGraph(data)
    const origin = snapToNearestNode(graph, 38.7077934, -9.1365543)
    const destination = snapToNearestNode(graph, 38.7140244, -9.1379408)
    expect(origin).toBe(0)
    expect(destination).toBe(3)

    const path = findPath(graph, origin!, destination!)
    expect(path).not.toBeNull()
    // Node 2 is the flat, longer detour; node 1 is the steep, shorter shortcut.
    expect(path!.nodeIds).toEqual([0, 2, 3])
    expect(path!.distanceM).toBeGreaterThan(700)
  })
})
