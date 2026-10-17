@echo off
echo ======================================================================
echo           ClinicFlow AI - Smart Clinic Management Platform
echo           Multi-Role Healthcare Operations Platform
echo ======================================================================
echo.
echo [1/2] Initializing Python Backend & SQLite Database...
start "ClinicFlow AI - Backend (FastAPI)" cmd /k "python backend\run_backend.py"

echo [2/2] Starting React Vite Frontend...
cd frontend
set PATH=C:\Program Files\nodejs;%PATH%
start "ClinicFlow AI - Frontend (Vite)" cmd /k "npm run dev"

echo.
echo ======================================================================
echo  ClinicFlow AI is running!
echo  - Frontend Dev:  http://localhost:5173
echo  - Backend API:   http://localhost:8000
echo  - API Docs:      http://localhost:8000/docs
echo  - Waiting TV:    http://localhost:5173 (Select 'Waiting Hall TV')
echo ======================================================================
pause
