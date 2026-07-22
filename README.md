# Lisbon Walking Map

Find a walking route between two Lisbon addresses: not just the shortest one, but the fastest,
the flattest, or the one that costs the least predicted energy.

Lisbon is famously hilly, and a route that's 10% longer but avoids a brutal climb is often the
better choice. Every request computes four routes side by side, each optimizing a different
notion of "best":

- **Lowest energy** (selected by default): minimizes predicted metabolic energy expenditure,
  using the cost-of-walking equation from Minetti et al. (2002),
  *[Energy cost of walking and running at extreme uphill and downhill slopes](https://doi.org/10.1152/japplphysiol.01177.2001)*
  (J Appl Physiol 93: 1039–1046), a polynomial fit to treadmill VO2 measurements across
  gradients from -45% to +45%. This is the most literal reading of "least effort": minimizing
  time or distance doesn't necessarily minimize how tired you actually get, since walking speed
  and metabolic cost are different functions of slope.
- **Fastest**: minimizes predicted walking time, using [Tobler's hiking
  function](https://en.wikipedia.org/wiki/Tobler%27s_hiking_function) to convert a street's
  slope into a predicted walking speed.
- **Shortest**: the most direct route by distance, ignoring hills entirely.
- **Lowest climb**: minimizes total elevation gain, even at the cost of extra distance.

These four routinely diverge. The fastest route can leave you more energy-depleted than a
slightly slower one, and the lowest-climb route can add far more distance than it saves in
climbing. All four render on the map at once; click or hover a route in the sidebar to bring
it to the front.

## Running locally

```bash
npm install
npm run dev
```

The app and its API run together under `npm run dev`, with no separate backend process or
account setup required.

## Testing

```bash
npm test          # unit tests (Vitest)
npm run test:e2e  # end-to-end (Playwright)
npm run typecheck # TypeScript
npm run lint      # Oxlint
```

## How routing works

1. **Offline, once per city**: `data-prep/build_graph.py` downloads Lisbon's walkable street
   network from OpenStreetMap, attaches elevation from the Copernicus DEM, and computes a
   Tobler's-function time cost for every street segment. The result is a compact graph committed
   at `data/cities/lisbon.json`.
2. **At request time**: the app geocodes your two addresses (via
   [Nominatim](https://nominatim.org/)), snaps each to the nearest point on the graph, and runs
   A* search four times, once per route mode (energy cost, time cost, distance, and
   climb-penalized distance), returning all four routes together.

### Adding another city

```bash
cd data-prep
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python3 build_graph.py --city sf --bbox=-122.45,37.74,-122.40,37.79 \
  --output ../data/cities/sf.json
```

Then add one entry to `api/_lib/cities.ts` pointing at the new file. No other code changes
needed.

## Data & attribution

- Street network: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL)
- Elevation: [Copernicus DEM GLO-30](https://registry.opendata.aws/copernicus-dem/) (ESA/Sinergise)
- Geocoding: [Nominatim](https://nominatim.org/)

## Deployment

Deployed on [Vercel](https://vercel.com) as a Vite app with serverless API functions under
`api/`. No environment variables or API keys are required.
