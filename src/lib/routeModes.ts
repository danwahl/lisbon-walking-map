import type { RouteMode } from '../../api/_lib/types.ts'

export type { RouteMode }

// 'energy' first: it's the default/selected mode.
export const ROUTE_MODES: RouteMode[] = ['energy', 'time', 'distance', 'climb']

export interface RouteModeMeta {
  label: string
  color: string
  blurb: string
}

export const ROUTE_MODE_META: Record<RouteMode, RouteModeMeta> = {
  energy: {
    label: 'Lowest energy',
    color: '#059669',
    blurb: 'Minimizes predicted metabolic energy cost (Minetti et al., 2002).',
  },
  time: {
    label: 'Fastest',
    color: '#dc2626',
    blurb: "Minimizes predicted walking time, accounting for how slope slows you down.",
  },
  distance: {
    label: 'Shortest',
    color: '#d97706',
    blurb: 'The most direct route by distance, ignoring hills entirely.',
  },
  climb: {
    label: 'Lowest climb',
    color: '#2563eb',
    blurb: 'Minimizes total climbing, even if it means walking further.',
  },
}
