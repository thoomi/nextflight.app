# NextFlight

AI-powered flight debrief tool for paragliding pilots.

**Live Site:** [nextflightbetter.app](https://nextflightbetter.app)

## Stack

- Static frontend source in `frontend/`
- Vite multi-page build
- ES modules, no frontend framework
- Playwright browser tests
- Vercel deployment from `dist/`

## Development

```bash
npm install
npm run dev
```

Build and preview production output:

```bash
npm run build
npm run preview
```

`npm run build` writes `dist/`. Vercel uses `npm run build` and deploys `dist` as configured in `vercel.json`.

## Tests

```bash
npm run check:syntax
npm run test:smoke
npm run test:e2e
```

Playwright variants:

```bash
npm run test:e2e:headed
npm run test:e2e:ui
```

## Deployment

Pushes to `main` deploy through Vercel when `VERCEL_TOKEN` is configured in GitHub Actions secrets.

Manual production deploy:

```bash
vercel --prod
```

## License

Private - All Rights Reserved
