#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Ensure Python 3.12
python -c "import sys; sys.exit(0 if sys.version_info[:3]==(3,12) else 1)" || { echo "Please use Python 3.12"; exit 1; }

python -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate

# Bootstrap uv (pinned) then install project deps via uv
python -m pip install --upgrade pip
python -m pip install --no-cache-dir "uv==0.9.11"
uv pip install --no-cache-dir '.[dev]'

echo "Environment setup complete. Activate with 'source .venv/bin/activate' and run 'uvicorn main:app --reload'"