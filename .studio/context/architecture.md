# Architecture

NextFlight is a framework-free static frontend built from HTML, CSS, and ES modules.
Vite treats `frontend/` as a multi-page source root for the landing, concept, and
flight-analyzer pages. `npm run build` writes the generated site to `dist/`, then
`scripts/copy-static-assets.cjs` copies the source assets, styles, modules, samples,
and crawler files that Vite does not emit itself. Vercel publishes `dist/` according
to `vercel.json`; `.github/workflows/deploy.yml` runs the production deployment.

Application source is under `frontend/`, build helpers under `scripts/`, and smoke
and Playwright coverage under `tests/`. `dist/` and `node_modules/` are generated and
are not source. See `README.md` for setup and deployment, and `AGENTS.md` plus
`docs/dev-loop.md` for the repository map and development checks.
