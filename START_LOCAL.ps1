$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\Backend"
Write-Host "Starting PostgreSQL + Redis containers via Docker Compose..." -ForegroundColor Cyan
docker compose up -d postgres redis

Write-Host "Determining Python interpreter..." -ForegroundColor Cyan
$pythonExe = "python"
if (Test-Path ".\.venv\Scripts\python.exe") {
    $pythonExe = ".\.venv\Scripts\python.exe"
} elseif (Test-Path ".\venv\Scripts\python.exe") {
    $pythonExe = ".\venv\Scripts\python.exe"
}

Write-Host "Starting FastAPI locally on http://127.0.0.1:8000 using $pythonExe..." -ForegroundColor Cyan
& $pythonExe -m uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
