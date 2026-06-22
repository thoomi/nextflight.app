# NextFlight

AI-powered flight debrief tool for paragliding pilots.

**Live Site:** [nextflightbetter.app](https://nextflightbetter.app)

## Stack

- Static frontend source in `frontend/` — Vite multi-page build, ES modules, no framework
- Pages: landing (`index.html`/`concept.html`), analyzer (`app.html`), Flight Art (`art.html`)
- Supabase (Auth + Postgres + Storage) for the optional account / saved designs on `/art`
- Playwright browser tests; Vercel deployment from `dist/`

## Development

```bash
npm install
npm run dev        # Vite dev server
npm run build      # writes dist/
npm run preview    # serve the production build
```

Vercel uses `npm run build` and deploys `dist/` per `vercel.json`.

### Cloud (optional — only for account / saved-designs work)

```bash
cp .env.example .env   # set SUPABASE_URL + SUPABASE_ANON_KEY (public keys; RLS is the boundary)
npm run db:start       # start local Supabase (prints the local URL + anon key)
npm run db:reset       # reapply migrations / reset the local DB
```

The build inlines only `SUPABASE_URL` + `SUPABASE_ANON_KEY`. Never commit or expose a service-role key.

## Tests

```bash
npm run check:syntax    # syntax check across source
npm run test:smoke      # analyzer sanity check
npm run test:e2e        # Playwright, cloud-free (no Supabase needed)
npm run test:e2e:cloud  # Playwright cloud suite (requires npm run db:start)
```

Variants: `npm run test:e2e:headed`, `npm run test:e2e:ui`. The cloud suite self-skips without a local stack, so the default run stays green.

## Deployment

Pushes to `main` deploy through Vercel when `VERCEL_TOKEN` is set in GitHub Actions secrets. Manual: `vercel --prod`.

## License

Private - All Rights Reserved
