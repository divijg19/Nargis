# PowerShell helper to create venv and install deps with uv
Set-Location -Path $PSScriptRoot\..\
# Ensure Python 3.12 is active
python -c "import sys; sys.exit(0 if sys.version_info[:3]==(3,12) else 1)"; if ($LASTEXITCODE -ne 0) { Write-Host 'Please use Python 3.12'; exit 1 }

python -m venv .venv
.\.venv\Scripts\Activate

# Bootstrap uv (pinned) then install deps via uv
python -m pip install --upgrade pip
python -m pip install --no-cache-dir "uv==0.9.11"
uv pip install --no-cache-dir '.[dev]'

Write-Host "Environment setup complete. Activate with '.\.venv\Scripts\Activate' and run 'uvicorn main:app --reload'"