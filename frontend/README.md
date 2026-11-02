# UrbanFlow AI — frontend

Cinematic homepage plus a five-page forecasting workspace for NYC taxi pickup demand
(LightGBM model served by FastAPI).

## Run locally

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # single-file production build → dist/index.html
npm run preview        # serve the production build
```

### Live model vs demo data
Without configuration the app runs in **Demo mode**: deterministic, illustrative series,
labelled "Demo data" everywhere. To use the real model:

```bash
VITE_API_URL=https://your-fastapi-host npm run dev   # POST {VITE_API_URL}/predict
```

If the backend can't be reached the UI reports **Connection failed** and shows no values —
it never substitutes demo numbers for a failed live request.

## Tests (Playwright, Chromium)

```bash
npx playwright install chromium        # once
npx playwright install-deps chromium   # once, Linux only
npx playwright test
```

`tests/city-explorer.spec.ts` checks the map with rendered pixels and real interactions
(tile content, markers, click/list/search selection, zoom, pan, reset, reload, mobile,
tile-failure fallback). `tests/city-transformation.spec.ts` covers the Scene 02 scroll
sequence; `tests/navigation.spec.ts` covers routing and forecasting.

## City Explorer basemap
Esri **World Dark Gray Canvas** raster tiles (no API key needed to view), with
"Powered by Esri" attribution. If tiles can't load, the map falls back to a labelled
schematic coastline so markers and selection keep working.

Region markers sit at neighbourhood centroids. The inference service does not publish
K-Means cluster polygons, so no boundaries are drawn.

## Photography
All homepage imagery is real photography, not generated:

| Scene | Photograph | Photographer |
| --- | --- | --- |
| 01 — Arrival | Aerial Manhattan skyline, night | Olivia Chen |
| 02 — The city becomes data | Drone view, city at night | Charles Parker |
| 03 — Hidden patterns | Rainy Manhattan street | Jane Mir |
| 04 — See the future | Times Square at night | Mateusz Walendzik |
| 05 — Control room | NYC traffic beneath a bridge | Matthis Volquardsen |

Sourced via [Pexels](https://www.pexels.com) (free to use, no attribution required —
credited anyway). To swap any of them, replace the matching file in `public/images/`
and rebuild. Type contrast over each photograph was measured in-browser and clears
WCAG AAA for the display sizes used.

Screenshots: `docs/screenshots/`.
