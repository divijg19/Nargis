Param(
  [string]$region = "iad",
  [string]$apiPyApp = "nargis-api-py",
  [string]$apiGoApp = "nargis-api-go"
)

Write-Host "Logging into Fly.io..."
flyctl auth login

Write-Host "Creating or selecting apps..."
Set-Location -Path "$(Split-Path -Parent $PSScriptRoot)\..\apps\api-py"
flyctl launch --name $apiPyApp --region $region --no-deploy
Set-Location -Path "$(Split-Path -Parent $PSScriptRoot)\..\apps\api-go"
flyctl launch --name $apiGoApp --region $region --no-deploy

Write-Host "Make sure you have your secrets in environment variables (OPENAI_API_KEY, ELEVENLABS_API_KEY)"
if ($env:OPENAI_API_KEY) { flyctl secrets set OPENAI_API_KEY=$env:OPENAI_API_KEY }
if ($env:ELEVENLABS_API_KEY) { flyctl secrets set ELEVENLABS_API_KEY=$env:ELEVENLABS_API_KEY }

Write-Host "Deploying services..."
Set-Location -Path "$(Split-Path -Parent $PSScriptRoot)\..\apps\api-py"
flyctl deploy
Set-Location -Path "$(Split-Path -Parent $PSScriptRoot)\..\apps\api-go"
flyctl deploy

Write-Host "Deployed. Remember to update your Vercel env vars and redeploy the frontend."
