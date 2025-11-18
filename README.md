# NextFlight

AI-powered flight debrief tool for paragliding pilots. Turn every flight into a bite-sized coaching session that builds skills and confidence.

**Live Site:** [nextflightbetter.app](https://nextflightbetter.app)

## Development Setup

### Frontend (Landing Page)

The landing page is a static site that can be served directly.

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

### Backend (Python Analysis Tool)

See [backend/README.md](backend/README.md) for detailed setup instructions.

```bash
cd backend

# Install uv (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Python 3.14
uv python install 3.14

# Create virtual environment
uv venv --python 3.14 .venv

# Activate virtual environment
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
uv pip install -e .

# Run analysis on sample file
python core/flight_debrief.py test/schauinsland_long_flight_many_thermals.igc
```

### API (Serverless Functions)

The API uses Vercel serverless functions for email subscriptions.

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Configure environment variables:
   - `RESEND_API_KEY`: Get from [resend.com/api-keys](https://resend.com/api-keys)
   - `NOTIFICATION_EMAIL`: Your email to receive signup notifications
   - `FROM_EMAIL`: Verified sender in Resend (or `onboarding@resend.dev` for testing)
   - `RESEND_AUDIENCE_ID`: Create an audience at [resend.com/audiences](https://resend.com/audiences) and copy its ID

3. Install dependencies:
   ```bash
   npm install
   ```

4. Test locally with Vercel CLI:
   ```bash
   npx vercel dev
   ```

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
3. Set environment variables in Vercel dashboard for the API:
   - `RESEND_API_KEY`
   - `NOTIFICATION_EMAIL`
   - `FROM_EMAIL`
   - `RESEND_AUDIENCE_ID`

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
- Routes API requests to `api/` serverless functions
- Enables clean URLs and proper caching

## Contributing

This is currently a private project in early development. If you'd like to contribute or have feedback, please reach out.

## License

Private - All Rights Reserved

## Contact

For early access, visit [nextflightbetter.app](https://nextflightbetter.app)
