import type { Route } from '../lib/api.ts'

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainderMinutes = minutes % 60
  return `${hours} h ${remainderMinutes} min`
}

interface RouteSummaryProps {
  route: Route
}

export function RouteSummary({ route }: RouteSummaryProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-800">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {(route.distanceM / 1000).toFixed(1)} km
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Distance</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {formatDuration(route.durationS)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Est. time</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            +{Math.round(route.ascentM)} m
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Climb</div>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        This route minimizes predicted walking effort, not just distance — it may trade a longer path for a
        gentler climb.
      </p>
    </div>
  )
}
