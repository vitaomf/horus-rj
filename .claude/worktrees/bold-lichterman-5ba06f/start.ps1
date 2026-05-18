Write-Host "[1/3] Iniciando Backend FastAPI (Porta 7291)..."
Start-Process -NoNewWindow -FilePath "python" -ArgumentList "-m uvicorn backend.api:app --port 7291"

Write-Host "[2/3] Iniciando Frontend React (Vite)..."
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory ".\frontend"

Write-Host "[3/3] Iniciando APScheduler..."
Start-Process -NoNewWindow -FilePath "python" -ArgumentList "scheduler\scheduler.py"

Write-Host "Todos os serviços do HORUS RJ estão rodando!"
Write-Host "Pressione [CTRL+C] não fechará as janelas pois rodam background no Powershell. Feche o terminal ou mate os processos manualmente."
