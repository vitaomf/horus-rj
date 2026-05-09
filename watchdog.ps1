# watchdog.ps1 - Horus RJ: watchdog definitivo.
$ErrorActionPreference = "SilentlyContinue"

$HORUS_DIR    = "C:\Users\joaov\OneDrive\Desktop\HORUS"
$PYTHON       = "$HORUS_DIR\.venv\Scripts\python.exe"
$NGROK_DOMAIN = "synergistic-hemathermal-myesha.ngrok-free.dev"
$NGROK_CONFIG = "$HORUS_DIR\ngrok.yml"
$LOG_DIR      = "$HORUS_DIR\logs"
$LOG_FILE     = "$LOG_DIR\watchdog.log"
$TUNNEL_LOG   = "$LOG_DIR\tunnel_raw.log"
$SCHED_OUT    = "$LOG_DIR\scheduler_stdout.log"
$SCHED_ERR    = "$LOG_DIR\scheduler_stderr.log"

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path","User")
$NGROK = (Get-Command ngrok -ErrorAction SilentlyContinue).Source
if (-not $NGROK) {
    $NGROK = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe"
}

if (-not (Test-Path $LOG_DIR)) { New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null }

function Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $LOG_FILE -Value "$ts  $msg" -Encoding UTF8
    $lines = Get-Content $LOG_FILE -ErrorAction SilentlyContinue
    if ($lines.Count -gt 1000) { $lines[-800..-1] | Set-Content $LOG_FILE -Encoding UTF8 }
}

function Backend-Healthy {
    try {
        $r = Invoke-WebRequest "http://127.0.0.1:7291/api/health" -TimeoutSec 5 -UseBasicParsing
        return $r.StatusCode -eq 200
    } catch { return $false }
}

function Ngrok-Healthy {
    foreach ($port in @(4040, 4041, 4042)) {
        try {
            $r = Invoke-RestMethod "http://127.0.0.1:$port/api/tunnels" -TimeoutSec 2
            $ok = $r.tunnels | Where-Object { $_.public_url -like "*$NGROK_DOMAIN*" }
            if ($null -ne $ok) { return $true }
        } catch {}
    }
    return $false
}

function Find-Backend {
    $procs = Get-CimInstance Win32_Process -Filter "Name='python.exe'" -ErrorAction SilentlyContinue
    $found = $procs | Where-Object { $_.CommandLine -like "*uvicorn*" -and $_.CommandLine -like "*7291*" }
    if ($found) { return @($found)[0].ProcessId } else { return 0 }
}

function Find-Scheduler {
    $procs = Get-CimInstance Win32_Process -Filter "Name='python.exe'" -ErrorAction SilentlyContinue
    $found = $procs | Where-Object { $_.CommandLine -like "*scheduler*" }
    if ($found) { return @($found)[0].ProcessId } else { return 0 }
}

Log "=== Horus watchdog iniciado ==="
Log "ngrok: $NGROK | config: $NGROK_CONFIG | domain: $NGROK_DOMAIN"

# Mata ngrok orphans antes de comecar
Stop-Process -Name ngrok -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$backendPid   = Find-Backend
$schedulerPid = Find-Scheduler
$tunnelPid    = 0

if ($backendPid)   { Log "Backend ja rodando: PID $backendPid" }
if ($schedulerPid) { Log "Scheduler ja rodando: PID $schedulerPid" }

$schedLastStart   = [datetime]::MinValue
$ngrokLastStart   = [datetime]::MinValue
$backendLastStart = [datetime]::MinValue

try {
    while ($true) {
        $now = [datetime]::Now

        # Backend (cooldown 20s)
        $backendAlive = ($backendPid -gt 0) -and (Get-Process -Id $backendPid -ErrorAction SilentlyContinue)
        $backendCoolOk = ($now - $backendLastStart).TotalSeconds -gt 20
        if ($backendCoolOk -and (-not $backendAlive -or -not (Backend-Healthy))) {
            if ($backendAlive) {
                Stop-Process -Id $backendPid -Force -ErrorAction SilentlyContinue
                Log "Backend nao respondia - reiniciando"
            } else {
                Log "Backend offline - iniciando..."
            }
            $p = Start-Process -PassThru -WindowStyle Hidden `
                -FilePath $PYTHON `
                -ArgumentList @("-m", "uvicorn", "backend.api:app", "--port", "7291") `
                -WorkingDirectory $HORUS_DIR
            $backendPid = if ($p) { $p.Id } else { 0 }
            $backendLastStart = [datetime]::Now
            Log "Backend PID $backendPid"
        }

        # Scheduler (cooldown 2min)
        $schedulerAlive = ($schedulerPid -gt 0) -and (Get-Process -Id $schedulerPid -ErrorAction SilentlyContinue)
        $schedCoolOk = ($now - $schedLastStart).TotalSeconds -gt 120
        if (-not $schedulerAlive -and $schedCoolOk) {
            Log "Scheduler offline - iniciando..."
            $p = Start-Process -PassThru -WindowStyle Hidden `
                -FilePath $PYTHON `
                -ArgumentList @("scheduler\scheduler.py") `
                -WorkingDirectory $HORUS_DIR `
                -RedirectStandardOutput $SCHED_OUT `
                -RedirectStandardError  $SCHED_ERR
            $schedulerPid = if ($p) { $p.Id } else { 0 }
            $schedLastStart = [datetime]::Now
            Log "Scheduler PID $schedulerPid"
        }

        # ngrok (cooldown 45s; mata TODOS antes de reiniciar; usa --config absoluto)
        $tunnelAlive = ($tunnelPid -gt 0) -and (Get-Process -Id $tunnelPid -ErrorAction SilentlyContinue)
        $ngrokCoolOk = ($now - $ngrokLastStart).TotalSeconds -gt 45
        if (-not $tunnelAlive -or ($ngrokCoolOk -and -not (Ngrok-Healthy))) {
            Stop-Process -Name ngrok -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            Log "ngrok iniciando..."
            Remove-Item $TUNNEL_LOG -ErrorAction SilentlyContinue
            $p = Start-Process -PassThru -WindowStyle Hidden `
                -FilePath $NGROK `
                -ArgumentList @("http", "--config=$NGROK_CONFIG", "--url=$NGROK_DOMAIN", "7291", "--log=stdout") `
                -WorkingDirectory $HORUS_DIR `
                -RedirectStandardOutput $TUNNEL_LOG
            $tunnelPid = if ($p) { $p.Id } else { 0 }
            $ngrokLastStart = [datetime]::Now
            Log "ngrok PID $tunnelPid"
        }

        Start-Sleep -Seconds 30
    }
} catch {
    Log "FATAL: $_ - reiniciando watchdog em 10s"
    Start-Sleep -Seconds 10
    $selfPath = $MyInvocation.MyCommand.Path
    Start-Process powershell.exe `
        -ArgumentList @("-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-File", $selfPath) `
        -WorkingDirectory $HORUS_DIR
}
