# Lisbon Walking Map

Find the least-*effort* walking route between two Lisbon addresses — not just the shortest one.

Lisbon is famously hilly, and a route that's 10% longer but avoids a brutal climb is often the
better choice. This app models that tradeoff using [Tobler's hiking
function](https://en.wikipedia.org/wiki/Tobler%27s_hiking_function), which converts a street's
slope into a predicted walking speed, then finds the route that minimizes total predicted time —
so a longer, flatter path naturally wins over a shorter, steeper one when it's genuinely easier.

## Running locally

```bash
npm install
npm run dev
```

That's it — the app and its API run together under `npm run dev`, no separate backend process
or account setup required.

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
   A* search to find the lowest-total-time path.

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
