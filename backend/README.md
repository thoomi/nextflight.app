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

# Install dependencies (including dev dependencies for testing and linting)
uv pip install -e ".[dev]"

# Install pre-commit hooks (recommended for development)
pre-commit install
```

### Development

```bash
# Format code
ruff format .

# Lint code
ruff check .

# Fix linting issues
ruff check --fix .

# Run tests
pytest

# Run tests with coverage
pytest --cov=flight_debrief --cov-report=term-missing
```

## Vision

Turn every paragliding flight into a coaching session with instant, actionable feedback on thermals, glides, and decision-making.
