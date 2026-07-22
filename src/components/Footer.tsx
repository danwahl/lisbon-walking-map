export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
      Map data ©{' '}
      <a href="https://www.openstreetmap.org/copyright" className="underline">
        OpenStreetMap
      </a>{' '}
      contributors (ODbL) · Elevation: Copernicus DEM GLO-30 (ESA/Sinergise) · Routing via Tobler's hiking function
    </footer>
  )
}
