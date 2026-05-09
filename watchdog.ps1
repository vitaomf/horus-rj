# watchdog.ps1 - Horus RJ: mantem backend + scheduler + ngrok sempre ativos.
# Sobe automaticamente no login via registro do Windows (setup_autostart.ps1).
$ErrorActionPreference = "SilentlyContinue"

$HORUS_DIR     = "C:\Users\joaov\OneDrive\Desktop\HORUS"
$PYTHON        = "$HORUS_DIR\.venv\Scripts\python.exe"
$LOG_DIR       = "$HORUS_DIR\logs"
$LOG_FILE      = "$LOG_DIR\watchdog.log"
$TUNNEL_LOG    = "$LOG_DIR\tunnel_raw.log"
$SCHED_OUT     = "$LOG_DIR\scheduler_stdout.log"
$SCHED_ERR     = "$LOG_DIR\scheduler_stderr.log"

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path","User")
$NGROK = (Get-Command ngrok -ErrorAction SilentlyContinue).Source

if (-not (Test-Path $LOG_DIR)) { New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null }

function Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $LOG_FILE -Value "$ts  $msg" -Encoding UTF8
}

function Port-Open($port) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", $port)
        $tcp.Close()
        return $true
    } catch {
        return $false
    }
}

Log "=== Horus watchdog iniciado | ngrok=$NGROK ==="

$backendPid   = 0
$schedulerPid = 0
$tunnelPid    = 0

while ($true) {

    # Backend
    $backendAlive = ($backendPid -gt 0) -and (Get-Process -Id $backendPid -ErrorAction SilentlyContinue)
    if (-not $backendAlive -and -not (Port-Open 7291)) {
        Log "Backend offline - iniciando..."
        $p = Start-Process -PassThru -WindowStyle Hidden `
            -FilePath $PYTHON `
            -ArgumentList "-m uvicorn backend.api:app --port 7291" `
            -WorkingDirectory $HORUS_DIR
        $backendPid = $p.Id
        Log "Backend PID $backendPid"
    }

    # Scheduler
    $schedulerAlive = ($schedulerPid -gt 0) -and (Get-Process -Id $schedulerPid -ErrorAction SilentlyContinue)
    if (-not $schedulerAlive) {
        Log "Scheduler offline - iniciando..."
        $p = Start-Process -PassThru -WindowStyle Hidden `
            -FilePath $PYTHON `
            -ArgumentList "scheduler\scheduler.py" `
            -WorkingDirectory $HORUS_DIR `
            -RedirectStandardOutput $SCHED_OUT `
            -RedirectStandardError $SCHED_ERR
        $schedulerPid = $p.Id
        Log "Scheduler PID $schedulerPid"
    }

    # ngrok
    $tunnelAlive = ($tunnelPid -gt 0) -and (Get-Process -Id $tunnelPid -ErrorAction SilentlyContinue)
    if (-not $tunnelAlive) {
        Log "ngrok offline - iniciando..."
        Remove-Item $TUNNEL_LOG -ErrorAction SilentlyContinue
        $p = Start-Process -PassThru -WindowStyle Hidden `
            -FilePath $NGROK `
            -ArgumentList @("http", "--url=synergistic-hemathermal-myesha.ngrok-free.dev", "7291", "--log=stdout") `
            -WorkingDirectory $HORUS_DIR `
            -RedirectStandardOutput $TUNNEL_LOG
        $tunnelPid = $p.Id
        Log "ngrok PID $tunnelPid"
    }

    Start-Sleep -Seconds 30
}
