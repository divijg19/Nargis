#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
fi

# Sync dependencies (creates .venv automatically)
echo "Syncing dependencies..."
uv sync --all-extras

echo "Environment setup complete. Run 'uv run uvicorn main:app --reload'"
```