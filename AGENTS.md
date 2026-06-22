# AGENTS.md

Concise technical context for continuing development in this repo.

## Repo Shape

- Static frontend source lives in `frontend/`. Vite does a multi-page build to `dist/`; Vercel deploys `dist/` via `vercel.json`.
- Pages: `index.html` / `concept.html` (landing), `app.html` (analyzer, entry `frontend/js/app.js`).
- Core pure modules (no DOM/canvas): `frontend/js/core/{igc-parser,flight-analyzer,file-loader}.js`.
- Analyzer UI in `frontend/js/analyzer/`.
- Cesium and Tailwind both load from CDN in the HTML (Cesium isolated behind `frontend/js/cesium-renderer.js`).

## Build And Run

```bash
npm install
npm run dev        # Vite dev server (Playwright drives it on 127.0.0.1:8765)
npm run build      # -> dist/ (also runs scripts/copy-static-assets.cjs)
npm run preview    # serve the production build
```

## Tests & Checks

```bash
npm run check:syntax    # node syntax check across source (also runs precommit via lint-staged)
npm run test:smoke      # analyzer sanity — expects output: 7319 15 65538
npm run test:e2e        # Playwright browser tests
```

- Run `test:e2e` after changes to any page HTML, analyzer modules, parser/analyzer core, or canvas rendering.

## Docs On The `concept-docs` Branch

Concept/research/strategy docs are NOT on `main` — they live on `concept-docs`: backend research `docs/backend-architecture.md`, product brief `docs/product/product-brief.md`, plus `docs/research/`, `docs/strategy/`, `docs/archive/`.

- With a shell: read without checking out via `git show concept-docs:docs/backend-architecture.md`.
- Read-only agents without Bash (e.g. `architect`) CANNOT `git show`. Whoever delegates must first materialize the branch doc to disk (`git show concept-docs:… > /tmp/…`) and pass the on-disk path; a `concept-docs:` path silently yields nothing.
- Loop artifacts for shipped features are on `main` under `docs/{briefs,plans,reviews}/`.

## Lean Development Loop

- Shared loop doc: `docs/dev-loop.md`.
- Default to the lean path: clarify only implementation-changing ambiguity, code the smallest correct change, run the relevant gates, then review/test only when risk or user-visible behavior warrants it.
- For broad/risky work, create `docs/plans/<feature>.md`; for formal review output, use `docs/reviews/<feature>.md`.
- Claude can invoke the loop with `/feature`; Codex should follow `docs/dev-loop.md` directly when asked to use the loop.

## Development Preferences

- Prefer explicit ES module imports over browser globals or script-order coupling.
- Keep parser/analyzer code pure and independent from DOM, canvas, and Cesium.
- Avoid adding a frontend framework unless the UI clearly needs component-level state.
- Do not add `Co-Authored-By: Claude` trailers to commits.
