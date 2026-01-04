<#
Run an integration smoke test using the local docker-compose Postgres (pgvector).

Steps:
- Start `db` service from repository infra/docker-compose.yml
- Wait for Postgres to accept connections on 127.0.0.1:5433
- Run `alembic upgrade head`
- Run pytest for integration tests
#>

param()

Write-Host "Starting db service with docker compose (infra/docker-compose.yml)..."
# Resolve repo root from script location and locate infra folder
Push-Location -LiteralPath (Resolve-Path "$PSScriptRoot\..\..\..\infra")
try {
    docker compose up -d db
} finally {
    Pop-Location
}

Function Wait-ForTcpPort {
    param(
        [string]$TargetHost = '127.0.0.1',
        [int]$TargetPort = 5433,
        [int]$TimeoutSeconds = 60
    )
    $start = Get-Date
    while ((Get-Date) - $start -lt (New-TimeSpan -Seconds $TimeoutSeconds)) {
        try {
            $s = New-Object System.Net.Sockets.TcpClient
            $async = $s.BeginConnect($TargetHost, $TargetPort, $null, $null)
            $wait = $async.AsyncWaitHandle.WaitOne(1000)
            if ($wait -and $s.Connected) {
                $s.EndConnect($async)
                $s.Close()
                return $true
            }
        } catch {
            # ignore
        }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

Write-Host "Waiting for Postgres on 127.0.0.1:5433..."
if (-not (Wait-ForTcpPort -TargetHost '127.0.0.1' -TargetPort 5433 -TimeoutSeconds 120)) {
    Write-Error "Timed out waiting for Postgres on port 5433"
    exit 1
}

Write-Host "Running alembic upgrade head..."
Push-Location -LiteralPath (Resolve-Path "$PSScriptRoot\..")
try {
    alembic upgrade head
} finally {
    Pop-Location
}

Write-Host "Running pytest integration tests..."
Push-Location -LiteralPath (Resolve-Path "$PSScriptRoot\..")
try {
    pytest -q tests
} finally {
    Pop-Location
}

Write-Host "Integration run complete."