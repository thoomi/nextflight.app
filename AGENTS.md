# AGENTS.md

Concise technical context for continuing development in this repo.

## Repo Shape

- Static frontend lives in `frontend/`.
- Main analyzer app: `frontend/app.html` plus `frontend/js/app.js`.
- Flight Art editor: `frontend/art.html`.
- Flight Art controller: `frontend/js/art-page.js`.
- Flight Art renderer: `frontend/js/art-renderer.js`.
- Shared browser globals:
  - `frontend/js/igc-parser.js` exposes `parseTrackFile(...)`.
  - `frontend/js/flight-analyzer.js` exposes `analyze(...)`.
- Deployment output directory is `frontend` via `vercel.json`.

This is a static frontend-only app with no build step. Pages use direct `<script>` tags and global functions.

## Flight Art Implementation Notes

- `art.html` is a standalone editor page with a left sidebar and large right-side poster canvas.
- `art-page.js` owns UI state, sample loading, file upload, preview sizing, and PNG export.
- `art-renderer.js` owns all canvas drawing and accepts a poster options object via:

```js
renderFlightArt(canvas, analysis, {
  preset,
  lineWeight,
  accentColor,
  showTitle,
  showSubtitle,
  showMarkers,
  showStats,
  title,
  subtitle,
  width,
  height
});
```

- Export size is A-series portrait: `2480 x 3508`.
- Preview size is computed from `#posterStage`, stage padding, and `window.devicePixelRatio`.
- The sidebar uses `<details data-art-step>` sections; `art-page.js` makes them behave like an accordion.
- Download button/status are outside the accordion area so they stay visible.
- Empty or disabled title/subtitle renders no text.
- `getArtworkBox(...)` in `art-renderer.js` controls how much space the track gets when title/subtitle/stats are hidden.

## Important Caveats

- `frontend/samples/` was untracked at last check, but `art-page.js` depends on files there for the sample gallery.
- Before deployment, either track `frontend/samples/` or change sample paths to deployed/tracked files.
- `package.json` has `"type": "module"`, so direct `require('./frontend/js/art-renderer.js')` may not work as expected. Use `node --check` or load scripts into a `vm` context for smoke tests.
- Playwright is installed for browser-level UI checks. Its web server binds a local port, which may require escalation/approval in sandboxed sessions.

## Useful Checks

For UI/canvas/layout work, prefer the Playwright smoke test over only static checks:

```bash
npm run test:e2e
```

Useful variants:

```bash
npm run test:e2e:headed
npm run test:e2e:ui
```

The Playwright config starts:

```bash
python3 -m http.server 8765 --directory frontend
```

and tests `/art.html` in Chromium.

Syntax:

```bash
node --check frontend/js/art-page.js
node --check frontend/js/art-renderer.js
```

Analyzer smoke test:

```bash
node - <<'NODE'
const fs = require('fs');
const vm = require('vm');
const ctx = { console, module: { exports: {} } };
vm.createContext(ctx);
for (const f of ['frontend/js/igc-parser.js', 'frontend/js/flight-analyzer.js', 'frontend/js/art-renderer.js']) {
  vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
}
const content = fs.readFileSync('frontend/samples/schauinsland_long_flight_many_thermals.igc', 'utf8');
const analysis = ctx.analyze(ctx.parseTrackFile(content, 'sample.igc'));
console.log(analysis.points.length, analysis.segments.length, Math.round(analysis.totalTrackDistance));
NODE
```

Expected recent output:

```text
7319 15 65538
```

## Development Preferences

- Keep Flight Art local-only and dependency-free unless explicitly asked.
- Prefer small deterministic canvas features over AI/generative calls.
- Keep the UI minimal and print-oriented.
- Do not reintroduce modal preview zoom unless explicitly requested.
- Preserve direct script-tag architecture unless a broader frontend migration is requested.
- Run `npm run test:e2e` after changes affecting `frontend/art.html`, `frontend/js/art-page.js`, `frontend/js/art-renderer.js`, or shared parser/analyzer behavior used by Flight Art.
