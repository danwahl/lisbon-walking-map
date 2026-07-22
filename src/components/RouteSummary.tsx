import type { Route } from '../lib/api.ts'
import { ROUTE_MODES, ROUTE_MODE_META, type RouteMode } from '../lib/routeModes.ts'

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainderMinutes = minutes % 60
  return `${hours} h ${remainderMinutes} min`
}

interface RouteSummaryProps {
  routes: Record<RouteMode, Route>
  selectedMode: RouteMode
  hoveredMode: RouteMode | null
  onSelect: (mode: RouteMode) => void
  onHover: (mode: RouteMode | null) => void
}

export function RouteSummary({ routes, selectedMode, hoveredMode, onSelect, onHover }: RouteSummaryProps) {
  return (
    <div className="flex flex-col gap-2">
      {ROUTE_MODES.map((mode) => {
        const route = routes[mode]
        const meta = ROUTE_MODE_META[mode]
        const isSelected = mode === selectedMode
        const isHovered = mode === hoveredMode

        return (
          <button
            key={mode}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(mode)}
            onMouseEnter={() => onHover(mode)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(mode)}
            onBlur={() => onHover(null)}
            style={{ borderLeftColor: meta.color }}
            className={`w-full rounded-lg border border-l-4 bg-white p-3 text-left shadow-sm transition hover:shadow-md dark:bg-slate-800 ${
              isSelected
                ? 'border-slate-300 dark:border-slate-500'
                : 'border-slate-200 opacity-80 dark:border-slate-700'
            } ${isHovered ? 'shadow-md' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">{meta.label}</span>
              {isSelected && (
                <span className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">Selected</span>
              )}
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {(route.distanceM / 1000).toFixed(1)} km
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Distance</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {formatDuration(route.durationS)}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Est. time</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  +{Math.round(route.ascentM)} m
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Climb</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {Math.round(route.energyKcal)} kcal
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Energy</div>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{meta.blurb}</p>
          </button>
        )
      })}
      <p className="px-1 text-[10px] text-slate-400 dark:text-slate-500">
        Energy is a predicted estimate for a 70&nbsp;kg reference walker, not personalized.
      </p>
    </div>
  )
}
