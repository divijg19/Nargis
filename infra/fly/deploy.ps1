Param(
  [string]$region = "iad",
  [string]$apiPyApp = "nargis-api-py",
  [string]$apiGoApp = "nargis-api-go"
)

Write-Host "Logging into Fly.io..."
if (-not (Get-Command flyctl -ErrorAction SilentlyContinue)) {
  Write-Error "flyctl not found in PATH. Install flyctl: https://fly.io/docs/hands-on/install-flyctl/"
  exit 1
}

flyctl auth login

Write-Host "Creating or selecting apps..."
Set-Location -Path "$(Split-Path -Parent $PSScriptRoot)\..\apps\api-py"
flyctl launch --name $apiPyApp --region $region --no-deploy
Set-Location -Path "$(Split-Path -Parent $PSScriptRoot)\..\apps\api-go"
flyctl launch --name $apiGoApp --region $region --no-deploy

Write-Host "Make sure you have your secrets in environment variables (OPENAI_API_KEY, ELEVENLABS_API_KEY)"

# Optional: load infra/fly/.env if present (convenience for local testing)
$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
  Write-Host "Loading environment variables from $envFile"
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^[ \t]*#') { return }
    if ($_ -match '^[ \t]*$') { return }
    if ($_ -match '^[ \t]*([^=\s]+)=(.*)$') {
      $k = $matches[1].Trim()
      $v = $matches[2].Trim()
      # strip surrounding quotes
      if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Trim('"') }
      Write-Host "  setting env: $k"
      Set-Item -Path Env:\$k -Value $v
    }
  }
}

# Helper: set secret for an app if the env var exists
function Set-SecretIfPresent([string]$app, [string]$key) {
  $val = (Get-Item -Path Env:\$key -ErrorAction SilentlyContinue).Value
  if ($val) {
    Write-Host "Setting secret $key on $app"
    flyctl secrets set --app $app $key=$val
  } else {
    Write-Host "Skipping $key (not set)"
  }
}

# Create app if missing (idempotent)
function Ensure-AppExists([string]$app, [string]$path) {
  try {
    & flyctl info --app $app > $null 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Host "Fly app '$app' already exists."
      return
    }
  } catch {
    # fall through to create
  }
  Write-Host "Creating Fly app '$app' from $path"
  Push-Location $path
  try {
    flyctl launch --name $app --region $region --no-deploy
  } finally {
    Pop-Location
  }
}

# API-PY secrets (model providers, DB, redis)
$pySecrets = @(
  'OPENAI_API_KEY','ELEVENLABS_API_KEY','DEEPGRAM_API_KEY','GROQ_API_KEY','GROQ_URL','PLAYHT_API_KEY',
  'STT_URL','LLM_URL','TTS_URL','NEON_DATABASE_URL','DATABASE_URL','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','REDIS_URL'
)

# API-GO secrets (usually pointers to api-py or redis)
$goSecrets = @('STT_URL','LLM_URL','REDIS_URL','UPSTASH_REDIS_REST_URL')

# Ensure apps exist before setting secrets
Ensure-AppExists $apiPyApp (Join-Path $PSScriptRoot "..\..\apps\api-py")
Ensure-AppExists $apiGoApp (Join-Path $PSScriptRoot "..\..\apps\api-go")

foreach ($s in $pySecrets) { Set-SecretIfPresent $apiPyApp $s }
foreach ($s in $goSecrets) { Set-SecretIfPresent $apiGoApp $s }

Write-Host "Deploying services..."
Set-Location -Path "$(Split-Path -Parent $PSScriptRoot)\..\apps\api-py"
flyctl deploy
Set-Location -Path "$(Split-Path -Parent $PSScriptRoot)\..\apps\api-go"
flyctl deploy

Write-Host "Deployed. Remember to update your Vercel env vars and redeploy the frontend."
Write-Host "Verify secrets were set (optional):"
Write-Host "  flyctl secrets list --app $apiPyApp"
Write-Host "  flyctl secrets list --app $apiGoApp"
Write-Host "If you need to update secrets, export them locally and re-run this script."
