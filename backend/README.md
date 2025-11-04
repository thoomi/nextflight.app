# Flight Debrief

AI-powered flight debrief tool for paragliding pilots. Turn every flight into a bite-sized coaching session that builds skills and confidence.

## Setup

This project uses Python 3.14 with modern tooling (uv, ruff).

### Install dependencies

```bash
# Install uv (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Python 3.14
uv python install 3.14

# Create virtual environment
uv venv --python 3.14 .venv

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
uv pip install -e .
```

### Development

```bash
# Format code
ruff format .

# Lint code
ruff check .

# Fix linting issues
ruff check --fix .
```

## Vision

Turn every paragliding flight into a coaching session with instant, actionable feedback on thermals, glides, and decision-making.
