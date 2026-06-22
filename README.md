# NextFlight

AI-powered flight debrief tool for paragliding pilots.

**Live Site:** [nextflightbetter.app](https://nextflightbetter.app)

## Stack

- Static frontend source in `frontend/` — Vite multi-page build, ES modules, no framework
- Pages: landing (`index.html`/`concept.html`), analyzer (`app.html`)
- Playwright browser tests; Vercel deployment from `dist/`

## Development

```bash
npm install
npm run dev        # Vite dev server
npm run build      # writes dist/
npm run preview    # serve the production build
```

Vercel uses `npm run build` and deploys `dist/` per `vercel.json`.

## Tests

```bash
npm run check:syntax   # syntax check across source
npm run test:smoke     # analyzer sanity check
npm run test:e2e       # Playwright browser tests
```

Variants: `npm run test:e2e:headed`, `npm run test:e2e:ui`.

## Deployment

Pushes to `main` deploy through Vercel when `VERCEL_TOKEN` is set in GitHub Actions secrets. Manual: `vercel --prod`.

## License

Private - All Rights Reserved
