$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\Backend"
Write-Host "Starting Digital FTE full Docker stack..." -ForegroundColor Cyan
docker compose up --build
