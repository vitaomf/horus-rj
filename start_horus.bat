@echo off
REM Inicia backend + Cloudflare Tunnel com auto-restart
REM Este arquivo é chamado pelo HorusLauncher.vbs na pasta Startup

cd /d "C:\Users\joaov\OneDrive\Desktop\HORUS"

:loop
REM Inicia o backend se não estiver rodando
powershell -Command "if (-not (Test-NetConnection -ComputerName localhost -Port 7291 -InformationLevel Quiet -WarningAction SilentlyContinue)) { Start-Process -WindowStyle Hidden '.venv\Scripts\python.exe' '-m uvicorn backend.api:app --port 7291' }"

REM Inicia cloudflared se não estiver rodando
tasklist /FI "IMAGENAME eq cloudflared.exe" 2>NUL | find /I "cloudflared.exe" >NUL
if errorlevel 1 (
    echo %date% %time% Iniciando tunel... >> logs\watchdog.log
    start "" /B "C:\Users\joaov\AppData\Local\Microsoft\WinGet\Packages\Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe\cloudflared.exe" tunnel --url http://localhost:7291 >> logs\tunnel_raw.log 2>&1
    REM Extrai a URL do log apos 20s
    timeout /t 20 /nobreak >NUL
    powershell -Command "if (Test-Path 'logs\tunnel_raw.log') { $c = Get-Content 'logs\tunnel_raw.log' -Raw; if ($c -match 'https://[a-z0-9-]+\.trycloudflare\.com') { $Matches[0] | Set-Content 'logs\tunnel_url.txt'; Write-Host 'URL:', $Matches[0] } }"
)

timeout /t 30 /nobreak >NUL
goto loop
