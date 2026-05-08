# watchdog.ps1 — Horus RJ: mantém backend + Cloudflare Tunnel sempre ativos.
$ErrorActionPreference = "SilentlyContinue"

$HORUS_DIR   = "C:\Users\joaov\OneDrive\Desktop\HORUS"
$PYTHON      = "$HORUS_DIR\.venv\Scripts\python.exe"
$LOG_DIR     = "$HORUS_DIR\logs"
$LOG_FILE    = "$LOG_DIR\watchdog.log"
$TUNNEL_FILE = "$LOG_DIR\tunnel_url.txt"
$TUNNEL_LOG  = "$LOG_DIR\tunnel_raw.log"

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path","User")
$CLOUDFLARED = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $CLOUDFLARED -or -not (Test-Path $CLOUDFLARED)) {
    $CLOUDFLARED = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe\cloudflared.exe"
}

if (-not (Test-Path $LOG_DIR)) { New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null }

function Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $LOG_FILE -Value "$ts  $msg" -Encoding UTF8
}

function Port-Open($port) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", $port)
        $tcp.Close(); return $true
    } catch { return $false }
}

Log "=== Horus watchdog iniciado | cloudflared=$CLOUDFLARED ==="

$backendPid = 0
$tunnelPid  = 0

while ($true) {
    # ── Backend ──────────────────────────────────────────────────────────────
    $backendAlive = ($backendPid -gt 0) -and (Get-Process -Id $backendPid -ErrorAction SilentlyContinue)
    if (-not $backendAlive -and -not (Port-Open 7291)) {
        Log "Backend offline — iniciando..."
        $p = Start-Process -PassThru -WindowStyle Hidden `
            -FilePath $PYTHON `
            -ArgumentList "-m uvicorn backend.api:app --port 7291" `
            -WorkingDirectory $HORUS_DIR
        $backendPid = $p.Id
        Log "Backend PID $backendPid"
    }

    # ── Tunnel ───────────────────────────────────────────────────────────────
    $tunnelAlive = ($tunnelPid -gt 0) -and (Get-Process -Id $tunnelPid -ErrorAction SilentlyContinue)
    if (-not $tunnelAlive) {
        Log "Túnel offline — iniciando..."
        Remove-Item $TUNNEL_LOG -ErrorAction SilentlyContinue

        $p = Start-Process -PassThru -WindowStyle Hidden `
            -FilePath $CLOUDFLARED `
            -ArgumentList "tunnel --url http://localhost:7291" `
            -WorkingDirectory $HORUS_DIR `
            -RedirectStandardError $TUNNEL_LOG
        $tunnelPid = $p.Id
        Log "Túnel PID $tunnelPid — aguardando URL..."

        # Aguarda URL aparecer no log (até 30s)
        $waited = 0
        while ($waited -lt 30) {
            Start-Sleep -Seconds 3; $waited += 3
            if (Test-Path $TUNNEL_LOG) {
                $content = Get-Content $TUNNEL_LOG -Raw -ErrorAction SilentlyContinue
                if ($content -match 'https://[a-z0-9\-]+\.trycloudflare\.com') {
                    $url = $Matches[0]
                    Set-Content $TUNNEL_FILE -Value $url -Encoding UTF8
                    Log "TUNNEL URL: $url"
                    break
                }
            }
        }
    }

    Start-Sleep -Seconds 30
}
