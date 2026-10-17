# ClinicFlow AI Launch Script for PowerShell
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "          ClinicFlow AI - Smart Clinic Management Platform" -ForegroundColor White
Write-Host "          Multi-Role Healthcare Operations Platform" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$env:PATH = "C:\Program Files\nodejs;" + $env:PATH

# Start backend in new process
Write-Host "[1/2] Starting Backend Server (FastAPI on Port 8000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; python backend\run_backend.py"

# Start frontend in new process
Write-Host "[2/2] Starting Frontend Vite Server (Port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; cmd /c 'set PATH=C:\Program Files\nodejs;%PATH% && npm run dev'"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  ClinicFlow AI is running!" -ForegroundColor Green
Write-Host "  - Frontend URL:   http://localhost:5173" -ForegroundColor White
Write-Host "  - Integrated App: http://localhost:8000" -ForegroundColor White
Write-Host "  - Backend Docs:   http://localhost:8000/docs" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Cyan
