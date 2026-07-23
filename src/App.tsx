import { useEffect, useState } from 'react'
import { AddressForm } from './components/AddressForm.tsx'
import { Footer } from './components/Footer.tsx'
import { MapView } from './components/MapView.tsx'
import { RouteSummary } from './components/RouteSummary.tsx'
import { ShareButton } from './components/ShareButton.tsx'
import { getRoutes, RouteRequestError, type GeocodeResult, type Route, type RouteErrorCode } from './lib/api.ts'
import type { RouteMode } from './lib/routeModes.ts'
import { buildShareUrl, parseSharedRoute } from './lib/shareUrl.ts'

type Status = 'idle' | 'loading' | 'error'

const ERROR_MESSAGES: Record<RouteErrorCode | 'unknown_error', string> = {
  outside_coverage: 'Both addresses need to be within central Lisbon.',
  no_nearby_path: "One of those addresses isn't close enough to a walkable street.",
  no_route: 'No walking route was found between those addresses.',
  method_not_allowed: 'Something went wrong finding a route. Please try again.',
  invalid_request: 'Something went wrong finding a route. Please try again.',
  unknown_city: 'Something went wrong finding a route. Please try again.',
  internal_error: 'Something went wrong finding a route. Please try again.',
  unknown_error: 'Something went wrong finding a route. Please try again.',
}

function App() {
  // Parsed once, at mount, from a shared-route link like "?olat=...&dlabel=...&mode=time".
  const [sharedRoute] = useState(() => parseSharedRoute(window.location.search))

  const [origin, setOrigin] = useState<GeocodeResult | null>(sharedRoute?.origin ?? null)
  const [destination, setDestination] = useState<GeocodeResult | null>(sharedRoute?.destination ?? null)
  const [routes, setRoutes] = useState<Record<RouteMode, Route> | null>(null)
  const [selectedMode, setSelectedMode] = useState<RouteMode>(sharedRoute?.mode ?? 'energy')
  const [hoveredMode, setHoveredMode] = useState<RouteMode | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // What AddressForm's fields should show. Only updated when App itself wants
  // to override the form's normally-independent text (a shared link on load,
  // or a "Reverse route" click) — remounting AddressForm (via formResetKey)
  // picks it up, since the form otherwise treats its fields as uncontrolled.
  const [formSeed, setFormSeed] = useState(() =>
    sharedRoute ? { origin: sharedRoute.origin, destination: sharedRoute.destination } : null,
  )
  const [formResetKey, setFormResetKey] = useState(0)

  async function fetchRoutes(newOrigin: GeocodeResult, newDestination: GeocodeResult, mode: RouteMode = 'energy') {
    setOrigin(newOrigin)
    setDestination(newDestination)
    setStatus('loading')
    setErrorMessage(null)
    try {
      const result = await getRoutes(newOrigin, newDestination)
      setRoutes(result)
      setSelectedMode(mode)
      setHoveredMode(null)
      setStatus('idle')
    } catch (err) {
      setRoutes(null)
      setStatus('error')
      const code = err instanceof RouteRequestError ? err.code : 'unknown_error'
      setErrorMessage(ERROR_MESSAGES[code])
    }
  }

  function handleSubmit(newOrigin: GeocodeResult, newDestination: GeocodeResult) {
    return fetchRoutes(newOrigin, newDestination, 'energy')
  }

  function handleReverse() {
    if (!origin || !destination) return
    const newOrigin = destination
    const newDestination = origin
    setFormSeed({ origin: newOrigin, destination: newDestination })
    setFormResetKey((k) => k + 1)
    void fetchRoutes(newOrigin, newDestination, selectedMode)
  }

  // Auto-run a shared link's route on load, honoring its mode instead of
  // resetting to the 'energy' default a fresh manual search would use.
  useEffect(() => {
    if (sharedRoute) void fetchRoutes(sharedRoute.origin, sharedRoute.destination, sharedRoute.mode)
    // `sharedRoute` never changes after mount (its state setter is never called),
    // so this still only ever runs once.
  }, [sharedRoute])

  // Keep the browser URL in sync with the currently displayed route, mirroring
  // Google Maps: submitting a search or switching the selected mode updates the
  // address bar so the page can be copy/pasted or bookmarked as-is.
  useEffect(() => {
    if (!origin || !destination || !routes) return
    const url = buildShareUrl(window.location.pathname, origin, destination, selectedMode)
    window.history.replaceState(null, '', url)
  }, [origin, destination, selectedMode, routes])

  return (
    <div className="flex h-dvh flex-col bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Lisbon Walking Map</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Walking routes across Lisbon, weighed by effort, time, distance, or climb
        </p>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <div className="flex flex-col gap-4 overflow-y-auto border-b border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:w-96 md:border-b-0 md:border-r">
          <AddressForm
            key={formResetKey}
            onSubmit={handleSubmit}
            isLoading={status === 'loading'}
            initialOrigin={formSeed?.origin}
            initialDestination={formSeed?.destination}
          />
          {status === 'error' && errorMessage && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              {errorMessage}
            </p>
          )}
          {routes && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleReverse}
                  disabled={status === 'loading'}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Reverse route
                </button>
                <ShareButton />
              </div>
              <RouteSummary
                routes={routes}
                selectedMode={selectedMode}
                hoveredMode={hoveredMode}
                onSelect={setSelectedMode}
                onHover={setHoveredMode}
              />
            </>
          )}
        </div>
        <div className="min-h-[300px] flex-1">
          <MapView
            origin={origin}
            destination={destination}
            routes={routes}
            selectedMode={selectedMode}
            hoveredMode={hoveredMode}
            onHover={setHoveredMode}
            onSelect={setSelectedMode}
          />
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default App
