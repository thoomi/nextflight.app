# AGENTS.md

Concise technical context for continuing development in this repo.

## Repo Shape

- Static frontend source lives in `frontend/`. Vite does a multi-page build to `dist/`; Vercel deploys `dist/` via `vercel.json`.
- Pages: `index.html` / `concept.html` (landing), `app.html` (analyzer, entry `frontend/js/app.js`), `art.html` (Flight Art, entry `frontend/js/art-page.js`).
- Core pure modules (no DOM/canvas): `frontend/js/core/{igc-parser,flight-analyzer,file-loader}.js`.
- Analyzer UI in `frontend/js/analyzer/`; Flight Art in `frontend/js/art/`; cloud/account code in `frontend/js/cloud/`.
- Cesium and Tailwind both load from CDN in the HTML (Cesium isolated behind `frontend/js/cesium-renderer.js`).
- Backend: Supabase (Auth + Postgres + Storage) powers the optional account + saved designs on `/art`. Local stack config + SQL in `supabase/` (`migrations/`, `config.toml`).

## Build And Run

```bash
npm install
npm run dev        # Vite dev server (Playwright drives it on 127.0.0.1:8765)
npm run build      # -> dist/ (also runs scripts/copy-static-assets.cjs)
npm run preview    # serve the production build
```

### Cloud / Supabase (only needed for account + saved-designs work on /art)

```bash
npm run db:start   # supabase start — prints the local API URL + anon key
npm run db:reset   # reapply migrations / reset local DB
```

- Env: copy `.env.example` → `.env`. The build inlines **only** `SUPABASE_URL` + `SUPABASE_ANON_KEY` (see `vite.config.js` `define`). Both are public by design — **RLS is the security boundary**. NEVER put a service-role key anywhere the client build can read.
- `art.html` imports the cloud modules **directly** (plain static imports in `art-page.js`). There is no lazy-load / "privacy spine" gating — do not reintroduce it.

## Tests & Checks

```bash
npm run check:syntax    # node syntax check across source (also runs precommit via lint-staged)
npm run test:smoke      # analyzer sanity — expects output: 7319 15 65538
npm run test:e2e        # Playwright, cloud-free default suite (no stack needed)
npm run test:e2e:cloud  # Playwright cloud suite — needs `npm run db:start`
```

- Default `test:e2e` ignores `tests/e2e/cloud/**`; the cloud project self-skips when `SUPABASE_URL` is absent, so it is green without a stack.
- Cloud specs live in `tests/e2e/cloud/` (`auth`, `designs`, `rls`, `helpers`). Known quirk: the GoTrue local stack rate-limits magic-link OTP requests, so a full serial cloud run can flake on back-to-back sign-ins even when each test passes alone.
- Run `test:e2e` after changes to any page HTML, analyzer/Flight Art modules, parser/analyzer core, or canvas rendering. Run `test:e2e:cloud` after touching `frontend/js/cloud/` or `supabase/`.

## Flight Art Notes

- `art-page.js` owns UI state, sample loading, file upload, preview sizing, PNG export, and the cloud account/saved-designs UI (full-screen "My designs" overview).
- Renderers: 2D `frontend/js/art/art-renderer.js` (`renderFlightArt(canvas, analysis, options)`), 3D `frontend/js/art/art-renderer-3d.js` (`renderAltitudeSculpture`, async — three.js lazy-loaded).
- Export size is A-series portrait: `2480 x 3508`.
- Keep the local rendering path deterministic and dependency-light.

## Docs On The `concept-docs` Branch

Concept/research/strategy docs are NOT on `main` — they live on `concept-docs`: active art concept `docs/flight-art-concept.md`, backend research `docs/backend-architecture.md`, product brief `docs/product/product-brief.md`, plus `docs/research/`, `docs/strategy/`, `docs/archive/`.

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
