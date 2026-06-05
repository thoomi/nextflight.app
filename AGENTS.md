# AGENTS.md

Concise technical context for continuing development in this repo.

## Repo Shape

- Static frontend source lives in `frontend/`.
- Vite builds the deployable site to `dist/`; Vercel deploys `dist` via `vercel.json`.
- Main analyzer page: `frontend/app.html` with module entry `frontend/js/app.js`.
- Flight Art page: `frontend/art.html` with module entry `frontend/js/art-page.js`.
- Core pure modules:
  - `frontend/js/core/igc-parser.js`
  - `frontend/js/core/flight-analyzer.js`
  - `frontend/js/core/file-loader.js`
- Analyzer UI modules live in `frontend/js/analyzer/`.
- Flight Art modules live in `frontend/js/art/`.
- Cesium still loads from CDN in `app.html`; Tailwind still loads from CDN.

## Build And Run

```bash
npm install
npm run dev
npm run build
npm run preview
```

- Dev server runs through Vite on `127.0.0.1:8765` when used by Playwright.
- Production build output is `dist/`.
- `scripts/copy-static-assets.cjs` copies static assets and samples into `dist`.

## Useful Checks

```bash
npm run check:syntax
npm run test:smoke
npm run test:e2e
```

Useful Playwright variants:

```bash
npm run test:e2e:headed
npm run test:e2e:ui
```

- `test:smoke` expects analyzer output: `7319 15 65538`.
- `test:e2e` covers core modules, analyzer module startup, and Flight Art canvas/export behavior.
- Run `npm run test:e2e` after changes to `frontend/app.html`, `frontend/art.html`, analyzer modules, Flight Art modules, parser/analyzer core, or canvas rendering.

## Flight Art Notes

- `art-page.js` owns UI state, sample loading, file upload, preview sizing, and PNG export.
- `frontend/js/art/art-renderer.js` owns deterministic canvas drawing.
- `renderFlightArt(canvas, analysis, options)` is the renderer API.
- Export size is A-series portrait: `2480 x 3508`.
- Keep Flight Art local-only, deterministic, and dependency-light unless explicitly requested.

## Development Preferences

- Prefer explicit ES module imports over browser globals or script-order coupling.
- Keep parser/analyzer code pure and independent from DOM, canvas, and Cesium.
- Keep Cesium isolated behind `frontend/js/cesium-renderer.js`.
- Avoid adding a frontend framework unless the UI clearly needs component-level state management.
