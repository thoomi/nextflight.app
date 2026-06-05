# NextFlight

AI-powered flight debrief tool for paragliding pilots. Turn every flight into a bite-sized coaching session that builds skills and confidence.

**Live Site:** [nextflightbetter.app](https://nextflightbetter.app)

## Development Setup

### Frontend

This is a static frontend app that can be served directly. It includes the landing page, the analyzer app, and the Flight Art editor.

```bash
# Install Node.js dependencies
npm install

# Serve locally (using any static server)
npx serve frontend

# Or open directly in browser
open frontend/index.html
```

Forward Dev Port on windows to access WSL2 from e.g. your phone:
`netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=172.31.82.34`

### Frontend Rendering Tests

Playwright is configured for browser-level smoke tests with Chromium. Use these when changing frontend UI, canvas rendering, or Flight Art behavior.

```bash
# Run headless Chromium tests
npm run test:e2e

# Run with a visible browser
npm run test:e2e:headed

# Open the Playwright test UI
npm run test:e2e:ui
```

The Playwright config starts a local static server automatically:

```bash
python3 -m http.server 8765 --directory frontend
```

In sandboxed development sessions this local port bind may require approval/escalation. The current smoke test covers `/art.html`, sample loading, canvas visibility/sizing, and title/subtitle toggle behavior.


## Deployment

### Automatic Deployment (GitHub Actions)

The project automatically deploys to Vercel when you push to the `main` branch.

**Setup (one-time):**

1. Get your Vercel token from [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Add `VERCEL_TOKEN` as a GitHub secret:
   - Go to your repo → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `VERCEL_TOKEN`
   - Value: Your Vercel token
**That's it!** Every push to `main` will automatically deploy to production.

### Manual Deployment (CLI)

You can also deploy manually using Vercel CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

The `vercel.json` configuration automatically:
- Serves static files from `frontend/`
- Enables clean URLs and proper caching

## Contributing

This is currently a private project in early development. If you'd like to contribute or have feedback, please reach out.

## License

Private - All Rights Reserved

## Contact

For early access, visit [nextflightbetter.app](https://nextflightbetter.app)
