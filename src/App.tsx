import { useState } from 'react'
import { AddressForm } from './components/AddressForm.tsx'
import { Footer } from './components/Footer.tsx'
import { MapView } from './components/MapView.tsx'
import { RouteSummary } from './components/RouteSummary.tsx'
import { getRoutes, RouteRequestError, type GeocodeResult, type Route, type RouteErrorCode } from './lib/api.ts'
import type { RouteMode } from './lib/routeModes.ts'

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
  const [origin, setOrigin] = useState<GeocodeResult | null>(null)
  const [destination, setDestination] = useState<GeocodeResult | null>(null)
  const [routes, setRoutes] = useState<Record<RouteMode, Route> | null>(null)
  const [selectedMode, setSelectedMode] = useState<RouteMode>('energy')
  const [hoveredMode, setHoveredMode] = useState<RouteMode | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(newOrigin: GeocodeResult, newDestination: GeocodeResult) {
    setOrigin(newOrigin)
    setDestination(newDestination)
    setStatus('loading')
    setErrorMessage(null)
    try {
      const result = await getRoutes(newOrigin, newDestination)
      setRoutes(result)
      setSelectedMode('energy')
      setHoveredMode(null)
      setStatus('idle')
    } catch (err) {
      setRoutes(null)
      setStatus('error')
      const code = err instanceof RouteRequestError ? err.code : 'unknown_error'
      setErrorMessage(ERROR_MESSAGES[code])
    }
  }

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
          <AddressForm onSubmit={handleSubmit} isLoading={status === 'loading'} />
          {status === 'error' && errorMessage && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              {errorMessage}
            </p>
          )}
          {routes && (
            <RouteSummary
              routes={routes}
              selectedMode={selectedMode}
              hoveredMode={hoveredMode}
              onSelect={setSelectedMode}
              onHover={setHoveredMode}
            />
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
