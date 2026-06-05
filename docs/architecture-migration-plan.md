# Frontend Architecture Review And Migration Plan

Context for continuing development in the next session. This is a plan only; no application code has been changed for this review.

## Current Architecture

- The frontend is deployed as static files from `frontend/`.
- The main analyzer app is `frontend/app.html` plus `frontend/js/app.js`.
- Flight Art is `frontend/art.html` plus:
  - `frontend/js/art-page.js` for UI state, sample loading, uploads, preview sizing, and PNG export.
  - `frontend/js/art-renderer.js` for deterministic canvas rendering.
- Shared browser-global scripts:
  - `frontend/js/igc-parser.js` exposes `parseTrackFile(...)`.
  - `frontend/js/flight-analyzer.js` exposes `analyze(...)` and `generateCoaching(...)`.
  - `frontend/js/utils.js`, `frontend/js/config.js`, `frontend/js/constants.js`, and `frontend/js/state.js` support the analyzer page.
- There is no frontend build step. Pages depend on direct `<script>` tag ordering.
- Playwright is installed and currently has a Flight Art smoke test.

## Main Maintainability Problems

- `frontend/js/app.js` is too broad. It mixes bootstrap, file upload, metrics rendering, coaching rendering, Cesium interactions, tabs, bottom-bar resizing, annotations, walkthroughs, replay controls, aircraft markers, and trail rendering.
- Browser globals are fragile. The analyzer assumes `APP_CONFIG`, `DOM_IDS`, `createDOMCache`, `appState`, `parseTrackFile`, `analyze`, `AltitudeChart`, and `CesiumRenderer` already exist globally. Flight Art assumes `parseTrackFile`, `analyze`, `ART_POSTER`, and `renderFlightArt` exist globally.
- Script order is the effective module system. Moving a script tag or adding a new dependency in the wrong place can break page startup.
- State ownership is inconsistent. The analyzer has `AppState`, but many free functions mutate the singleton directly. Flight Art uses a plain singleton object.
- File reading, sample loading, parse/analyze orchestration, status messages, and title/filename helpers are duplicated between the analyzer and Flight Art.
- HTML, CSS, and behavior are tightly coupled. Both main app pages contain substantial inline CSS and markup-specific JS assumptions.
- Existing `module.exports` guards are useful for smoke tests, but confusing in a `"type": "module"` package and not a real browser module boundary.

## Recommended Target Architecture

Keep the app framework-free for now, but migrate to boring ES modules with explicit imports.

Suggested structure:

```text
frontend/js/core/
  igc-parser.js
  flight-analyzer.js
  format.js
  file-loader.js

frontend/js/art/
  art-controller.js
  art-renderer.js
  art-samples.js

frontend/js/analyzer/
  analyzer-controller.js
  analyzer-state.js
  upload.js
  panels.js
  replay.js
  annotations.js
  walkthrough.js
  cesium-view.js
```

Design principles:

- Keep parser and analyzer code pure and independent from DOM, canvas, and Cesium.
- Keep `renderFlightArt(canvas, analysis, options)` deterministic and dependency-light.
- Make page controllers wire dependencies explicitly with imports.
- Keep Cesium behind a dedicated boundary.
- Avoid a frontend framework until the UI actually needs component-level state management.

## Vite Recommendation

Do not start by adding Vite. First create real module boundaries while keeping the static app working.

After modules are stable, Vite is a good fit because it is widely adopted, boring, and solves:

- native dev server ergonomics,
- explicit module graph,
- production bundling,
- easier test imports,
- asset handling.

If Vite is added, use it as a multi-page app for `index.html`, `app.html`, and `art.html`. Do not add React, Vue, or Svelte unless a future feature requires component-heavy UI.

Recommended dependencies if migrating:

- `vite`
- existing `@playwright/test`
- optionally `vitest` later for parser/analyzer/renderer unit tests

## jQuery Recommendation

Do not add jQuery or jQuery Mini.

Modern DOM APIs are cleaner for this codebase:

- `querySelector` / `querySelectorAll`
- `classList`
- `addEventListener`
- `dataset`
- `fetch`
- `FileReader`
- `URL`

jQuery would add a second coding style without solving the real issues: module boundaries, state ownership, script-order fragility, duplicated orchestration, and test coverage.

## Staged Migration Plan

### Stage 1: Stabilize Current Static App

- Decide whether `frontend/samples/` should be tracked for deployment.
- Add simple syntax check scripts:
  - `node --check frontend/js/art-page.js`
  - `node --check frontend/js/art-renderer.js`
  - equivalent checks for shared parser/analyzer files.
- Add or preserve a smoke test that parses and analyzes a known sample.
- Keep current script tags and browser globals during this stage.

### Stage 2: Convert Pure Shared Code First

- Convert parser/analyzer files to ES module exports.
- Keep temporary compatibility shims if needed, for example:

```js
window.parseTrackFile = parseTrackFile;
window.analyze = analyze;
```

- Add focused tests for:
  - IGC parsing,
  - GPX parsing,
  - sample analysis output,
  - common error paths.

### Stage 3: Modularize Flight Art

- Extract sample definitions from `art-page.js`.
- Extract file-reading and track-loading helpers.
- Keep poster option collection small and explicit.
- Keep `art-renderer.js` pure.
- Expand Playwright coverage:
  - sample loads,
  - sample switching works,
  - toggles re-render,
  - exported canvas uses `2480 x 3508`,
  - preview canvas is nonblank.

### Stage 4: Split The Analyzer Page

- Extract upload/load orchestration.
- Extract metrics, thermals, glides, and coaching panel rendering.
- Extract replay controls and replay state transitions.
- Extract annotation behavior.
- Keep `CesiumRenderer` or a renamed Cesium view module as the only direct Cesium integration boundary.
- Reduce direct singleton mutation where practical.

### Stage 5: Introduce Vite

- Add Vite only after the app has real ES module boundaries.
- Configure it as a multi-page static frontend.
- Keep deployment output static.
- Revisit Tailwind CDN usage. Either preserve simple CSS or move Tailwind into the build if it remains useful.

### Stage 6: Remove Compatibility Globals

- Remove temporary `window.*` shims.
- Remove CommonJS `module.exports` guards.
- Update tests to import modules directly.
- Keep browser pages fully module-driven.

## Risks

- Removing globals too early can break page startup.
- Cesium currently loads from CDN and may need careful handling if bundled or imported differently.
- Canvas output can regress visually unless tests check dimensions and nonblank pixels.
- Analyzer behavior is coupled to current analysis object shape.
- Flight Art depends on sample files under `frontend/samples/`; deployment breaks if those files are not tracked or paths change.
- Existing working tree has untracked Flight Art and test files, so confirm git status before committing or deploying.

## Test Coverage Needed

- Parser unit tests for valid and invalid IGC/GPX.
- Analyzer unit tests with fixed sample expectations.
- Flight Art renderer tests for dimensions, empty data errors, option normalization, and deterministic output sanity.
- Playwright tests for `/art.html`.
- Playwright smoke test for `/app.html` startup.
- Browser-level checks after any changes to:
  - `frontend/art.html`
  - `frontend/js/art-page.js`
  - `frontend/js/art-renderer.js`
  - `frontend/app.html`
  - `frontend/js/app.js`
  - parser/analyzer files.

## Files Likely To Change

- `frontend/js/igc-parser.js`
- `frontend/js/flight-analyzer.js`
- `frontend/js/art-renderer.js`
- `frontend/js/art-page.js`
- `frontend/art.html`
- `frontend/app.html`
- `frontend/js/app.js`
- `frontend/js/state.js`
- `frontend/js/utils.js`
- `package.json`
- `playwright.config.js`
- `tests/e2e/flight-art.spec.js`
- new module and unit test files under `frontend/js/core/`, `frontend/js/art/`, `frontend/js/analyzer/`, and `tests/`.

## Immediate Next Step

Start with Stage 1. Do not rewrite the application in one pass. The safest first code task is to add tests and syntax checks around the current behavior, then migrate the parser/analyzer to explicit ES module exports with temporary browser-global compatibility.
