$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot"
Write-Host "Starting AUTO-FTE (Digital FTE) full Docker stack (Frontend + Backend + PostgreSQL + Redis)..." -ForegroundColor Cyan
docker compose up --build
