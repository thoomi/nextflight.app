# NextFlight

AI-powered flight debrief tool for paragliding pilots. Turn every flight into a bite-sized coaching session that builds skills and confidence.

**Live Site:** [nextflightbetter.app](https://nextflightbetter.app)

## Project Structure

```
nextflight.app/
├── frontend/              # Landing page and future web app
│   ├── assets/           # Images, logos, OG images
│   ├── index.html        # Landing page
│   ├── script.js         # Frontend JavaScript
│   ├── styles.css        # Custom styles
│   ├── robots.txt        # Search engine directives
│   └── sitemap.xml       # Sitemap
├── backend/              # Python analysis engine
│   ├── api/             # API endpoints (future)
│   ├── core/            # Flight analysis code
│   │   └── flight_debrief.py
│   ├── test/            # Sample IGC files for testing
│   ├── docs/            # Product vision & technical docs
│   ├── pyproject.toml   # Python dependencies
│   └── README.md        # Backend-specific documentation
├── api/                 # Vercel serverless functions
│   └── subscribe.ts     # Email subscription endpoint
├── .env.example         # Environment variable template
├── vercel.json          # Vercel deployment configuration
└── package.json         # Node.js dependencies
```

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
   - `TO_EMAIL`: Your email to receive signup notifications
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

### Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Link your project:
   ```bash
   vercel link
   ```

3. Set environment variables in Vercel dashboard or CLI:
   ```bash
   vercel env add RESEND_API_KEY
   vercel env add TO_EMAIL
   vercel env add FROM_EMAIL
   vercel env add RESEND_AUDIENCE_ID
   ```

4. Deploy:
   ```bash
   vercel --prod
   ```

The `vercel.json` configuration automatically:
- Serves static files from `frontend/`
- Routes API requests to `api/` serverless functions
- Enables clean URLs and proper caching

## Tech Stack

### Frontend
- HTML5 + Tailwind CSS (CDN)
- Vanilla JavaScript
- Static site (no build step)

### Backend
- Python 3.14
- Pure Python (no external analysis dependencies)
- Modern tooling: uv, ruff

### API
- TypeScript
- Vercel Serverless Functions (Node.js 20.x)
- Resend API for email
- Zod for validation

## Project Status

### Completed
✅ Landing page with email capture
✅ Serverless subscribe endpoint
✅ Python flight analysis engine (CLI)
✅ Thermal detection algorithm
✅ Sample IGC test files
✅ Comprehensive product documentation

### In Progress
🚧 Web integration (file upload + visualization)
🚧 User authentication
🚧 Database for flight storage

### Planned
📋 2D/3D map visualization
📋 Animated flight replay
📋 Multi-flight progression tracking
📋 Advanced coaching (speedbar, low-saves)
📋 Instructor features
📋 Optional AI narrative enhancement

See [backend/docs/](backend/docs/) for detailed product vision and roadmap.

## Contributing

This is currently a private project in early development. If you'd like to contribute or have feedback, please reach out.

## License

Private - All Rights Reserved

## Contact

For early access, visit [nextflightbetter.app](https://nextflightbetter.app)
