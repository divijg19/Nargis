# PowerShell helper to setup env with uv
Set-Location -Path $PSScriptRoot\..\

# Check if uv is installed
if (-not (Get-Command "uv" -ErrorAction SilentlyContinue)) {
    Write-Host "Installing uv..."
    powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
}

# Sync dependencies (creates .venv automatically)
Write-Host "Syncing dependencies..."
uv sync --all-extras

Write-Host "Environment setup complete. Run 'uv run uvicorn main:app --reload'"