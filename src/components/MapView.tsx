import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { GeocodeResult, Route } from '../lib/api.ts'
import { ROUTE_MODES, ROUTE_MODE_META, type RouteMode } from '../lib/routeModes.ts'

// A plain inline-SVG pin instead of Leaflet's default blue marker, which reads
// as a fifth route color next to the four route lines (one of which is blue).
// Also sidesteps needing to fix up Leaflet's default marker asset paths under Vite.
const MARKER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
  <path d="M12.5 0C5.6 0 0 5.6 0 12.5 0 21.9 12.5 41 12.5 41S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" fill="#111827"/>
  <circle cx="12.5" cy="12.5" r="5" fill="#fff"/>
</svg>`

const markerIcon = L.icon({
  iconUrl: `data:image/svg+xml,${encodeURIComponent(MARKER_SVG)}`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

const LISBON_CENTER: [number, number] = [38.7169, -9.1399]

function FitBounds({ coordinates }: { coordinates: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (coordinates.length > 0) {
      map.fitBounds(coordinates, { padding: [32, 32] })
    }
  }, [coordinates, map])
  return null
}

interface MapViewProps {
  origin: GeocodeResult | null
  destination: GeocodeResult | null
  routes: Record<RouteMode, Route> | null
  selectedMode: RouteMode
  hoveredMode: RouteMode | null
  onHover?: (mode: RouteMode | null) => void
  onSelect?: (mode: RouteMode) => void
}

export function MapView({ origin, destination, routes, selectedMode, hoveredMode, onHover, onSelect }: MapViewProps) {
  const activeMode = hoveredMode ?? selectedMode
  // Draw the active route last so it stacks visually on top of the other two.
  const orderedModes = [...ROUTE_MODES].sort(
    (a, b) => (a === activeMode ? 1 : 0) - (b === activeMode ? 1 : 0),
  )
  // Memoized on `routes` alone so hovering/selecting (which re-renders MapView
  // via the selectedMode/hoveredMode props but leaves `routes` unchanged) doesn't
  // hand FitBounds a new array reference and re-trigger a fitBounds() snap.
  const allCoordinates = useMemo(
    () => (routes ? ROUTE_MODES.flatMap((mode) => routes[mode].coordinates) : []),
    [routes],
  )

  return (
    <MapContainer center={LISBON_CENTER} zoom={13} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {origin && <Marker position={[origin.lat, origin.lon]} icon={markerIcon} />}
      {destination && <Marker position={[destination.lat, destination.lon]} icon={markerIcon} />}
      {routes &&
        orderedModes.map((mode) => {
          const isActive = mode === activeMode
          const meta = ROUTE_MODE_META[mode]
          return (
            <Polyline
              key={mode}
              positions={routes[mode].coordinates}
              pathOptions={{
                color: meta.color,
                weight: isActive ? 5 : 3,
                opacity: isActive ? 0.95 : 0.4,
              }}
              eventHandlers={{
                mouseover: () => onHover?.(mode),
                mouseout: () => onHover?.(null),
                click: () => onSelect?.(mode),
              }}
            />
          )
        })}
      {routes && <FitBounds coordinates={allCoordinates} />}
    </MapContainer>
  )
}
