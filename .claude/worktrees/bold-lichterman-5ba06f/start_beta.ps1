# start_beta.ps1 — Ambiente BETA do Horus RJ
# Roda backend na porta 7292 e frontend Vite em modo dev (hot-reload)
# Use este para testar novas funcionalidades antes de subir para main.

$ErrorActionPreference = "Stop"
$ROOT = $PSScriptRoot

Write-Host ""
Write-Host "  HORUS RJ — Ambiente BETA" -ForegroundColor Yellow
Write-Host "  Backend : http://localhost:7292" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:5173  (hot-reload)" -ForegroundColor Cyan
Write-Host "  Banco   : transparencia_rj.db (mesmo da producao)" -ForegroundColor Gray
Write-Host ""

# Backend (porta 7292 para nao colidir com producao na 7291)
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "cd '$ROOT'; Write-Host '[BETA BACKEND]' -ForegroundColor Yellow; .\.venv\Scripts\python.exe -m uvicorn backend.api:app --port 7292 --reload"

Start-Sleep -Seconds 3

# Frontend dev (Vite com hot-reload aponta para porta 7292)
$env:VITE_API_PORT = "7292"
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "cd '$ROOT\frontend'; Write-Host '[BETA FRONTEND]' -ForegroundColor Yellow; npm run dev"

Write-Host "Beta iniciado! Acesse http://localhost:5173" -ForegroundColor Green
Write-Host "Para parar: feche as duas janelas PowerShell abertas." -ForegroundColor Gray
