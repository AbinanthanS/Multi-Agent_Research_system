# Starts all three services of the Multi-Agent Research System in separate PowerShell processes

$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host " Starting Multi-Agent Research System Locally    " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# 1. AI Service (FastAPI / LangGraph / Gemini on port 8000)
Write-Host "--> Launching AI Service on port 8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\ai-service'; .\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload"

# 2. Backend (Express API on port 5000)
Write-Host "--> Launching Backend API on port 5000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\backend'; npm run dev"

# 3. Frontend (React + Vite on port 5173)
Write-Host "--> Launching Frontend Dashboard on port 5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\frontend'; npm run dev"

Write-Host "`nAll 3 services have been launched in separate windows!" -ForegroundColor Yellow
Write-Host "  - Frontend:   http://localhost:5173" -ForegroundColor White
Write-Host "  - Backend:    http://localhost:5000" -ForegroundColor White
Write-Host "  - AI Service: http://127.0.0.1:8000" -ForegroundColor White
Write-Host "=================================================" -ForegroundColor Cyan
