<#
.SYNOPSIS
  Deploys the GST POC app on Windows using plain Node.js + MongoDB - no
  Docker required. Builds the React frontend, installs backend deps, and
  runs backend/server.js (which serves both the API and the built frontend
  on one port) under PM2 so it survives logout/reboot.

.PARAMETER RunMigrations
  Also run migrate_wards_circles.js -> migrate_divisions.js ->
  upload_businesses.js against ./new_data after starting. Only pass this
  the first time (it wipes and rebuilds wards/circles/divisions/businesses).

.PARAMETER Port
  Port the app listens on. Default 5000.

.EXAMPLE
  .\deploy-windows.ps1
  .\deploy-windows.ps1 -RunMigrations
  .\deploy-windows.ps1 -Port 80
#>
param(
    [switch]$RunMigrations,
    [int]$Port = 5000
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

function Require-Command($name, $hint) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Error "'$name' not found on PATH. $hint"
        exit 1
    }
}

Write-Host "== Checking prerequisites ==" -ForegroundColor Cyan
Require-Command node "Install Node.js LTS from https://nodejs.org/"
Require-Command npm  "Comes with Node.js - reinstall Node if missing."

$mongoRunning = $false
try {
    $svc = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
    if ($svc) {
        if ($svc.Status -ne 'Running') {
            Write-Host "Starting MongoDB service..."
            Start-Service MongoDB
        }
        $mongoRunning = $true
    }
} catch {}
if (-not $mongoRunning) {
    Write-Warning "Could not confirm a local 'MongoDB' Windows service is running. If you're using a remote/Atlas Mongo instead, that's fine - just make sure backend\.env's MONGO_URI points at it. Otherwise install MongoDB Community Server: https://www.mongodb.com/try/download/community"
}

# ---- backend/.env ----
$backendEnvPath = Join-Path $root "backend\.env"
$localEnvPath = Join-Path $root "backend\local.env"
if (-not (Test-Path $backendEnvPath)) {
    if (Test-Path $localEnvPath) {
        Write-Host "== Copying backend\local.env to backend\.env ==" -ForegroundColor Cyan
        Copy-Item $localEnvPath $backendEnvPath
    } else {
        Write-Host "== Creating backend\.env with a generated JWT secret ==" -ForegroundColor Cyan
        $bytes = New-Object byte[] 48
        [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
        $jwt = [Convert]::ToBase64String($bytes)
        @"
MONGO_URI=mongodb://localhost:27017/stateGst
JWT_SECRET=$jwt
PORT=$Port
"@ | Set-Content -Path $backendEnvPath -Encoding utf8
    }
    Write-Host "Wrote $backendEnvPath (edit MONGO_URI there if Mongo isn't local)."
} else {
    Write-Host "backend\.env already exists - leaving it as-is." -ForegroundColor Yellow
}

# ---- Install deps ----
Write-Host "== Installing backend dependencies ==" -ForegroundColor Cyan
Push-Location "$root\backend"
npm install --omit=dev
Pop-Location

Write-Host "== Installing frontend dependencies and building ==" -ForegroundColor Cyan
Push-Location "$root\map-selector"
npm install
# Same-origin deploy: leave these blank so the frontend calls relative
# URLs (e.g. /api/auth/login) instead of hardcoding a host.
$env:REACT_APP_BACKEND_URL = ""
$env:REACT_APP_GEOJSON_URL = ""
npm run build
Pop-Location

# ---- PM2 process manager (keeps the app running, survives reboot) ----
Write-Host "== Setting up PM2 ==" -ForegroundColor Cyan
if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    npm install -g pm2
    npm install -g pm2-windows-startup
    pm2-startup install
}

Push-Location "$root\backend"
$env:NODE_ENV = "production"
$env:PORT = "$Port"
if (pm2 list | Select-String "gst-app") {
    pm2 restart gst-app --update-env
} else {
    pm2 start server.js --name gst-app --env production
}
pm2 save
Pop-Location

Write-Host "== App started under PM2 on port $Port ==" -ForegroundColor Green
Write-Host "Check status:  pm2 status"
Write-Host "Tail logs:     pm2 logs gst-app"

# ---- Firewall (best-effort, needs admin) ----
try {
    $ruleName = "GST POC App ($Port)"
    if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow | Out-Null
        Write-Host "Opened inbound firewall rule for port $Port."
    }
} catch {
    Write-Warning "Could not create firewall rule automatically (needs admin). Open port $Port manually if this server is accessed remotely."
}

# ---- Data migration ----
if ($RunMigrations) {
    $wardsFile = Join-Path $root "new_data\wards.json"
    if (-not (Test-Path $wardsFile)) {
        Write-Warning "new_data\wards.json not found - skipping migrations. Copy your new_data\ folder in and re-run with -RunMigrations."
    } else {
        Write-Host "== Running data migration (wards/circles -> divisions -> businesses) ==" -ForegroundColor Cyan
        Push-Location "$root\backend"
        node migrate_wards_circles.js
        node migrate_divisions.js
        node upload_businesses.js
        Pop-Location
        Write-Host "== Migration complete ==" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "Data not loaded yet. Once new_data\ is in place, run:" -ForegroundColor Yellow
    Write-Host "  .\deploy-windows.ps1 -RunMigrations"
    Write-Host "or manually:"
    Write-Host "  cd backend"
    Write-Host "  node migrate_wards_circles.js"
    Write-Host "  node migrate_divisions.js"
    Write-Host "  node upload_businesses.js"
}

Write-Host ""
Write-Host "Open: http://localhost:$Port" -ForegroundColor Green
