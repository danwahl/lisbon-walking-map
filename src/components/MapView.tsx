import { useEffect } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { GeocodeResult, Route } from '../lib/api.ts'

// Icon.Default's built-in _getIconUrl prepends its own auto-detected base
// path onto whatever URLs we give it (meant for relative paths from a
// leaflet.css lookup), which mangles the already-absolute URLs Vite
// resolves for these imports. Deleting it falls back to the plain
// Icon._getIconUrl, which just uses the options below directly.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
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
  route: Route | null
}

export function MapView({ origin, destination, route }: MapViewProps) {
  return (
    <MapContainer center={LISBON_CENTER} zoom={13} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {origin && <Marker position={[origin.lat, origin.lon]} />}
      {destination && <Marker position={[destination.lat, destination.lon]} />}
      {route && <Polyline positions={route.coordinates} pathOptions={{ color: '#059669', weight: 5 }} />}
      {route && <FitBounds coordinates={route.coordinates} />}
    </MapContainer>
  )
}
