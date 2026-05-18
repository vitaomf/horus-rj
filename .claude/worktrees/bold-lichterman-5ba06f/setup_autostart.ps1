# setup_autostart.ps1 — Registra o watchdog do Horus RJ no Windows Task Scheduler.
# Rode UMA VEZ como administrador. Depois o watchdog sobe automaticamente no login.
#
# Para remover: Unregister-ScheduledTask -TaskName "HorusRJ-Watchdog" -Confirm:$false

$TASK_NAME  = "HorusRJ-Watchdog"
$HORUS_DIR  = "C:\Users\joaov\OneDrive\Desktop\HORUS"
$SCRIPT     = "$HORUS_DIR\watchdog.ps1"
$PS_EXE     = "powershell.exe"
$PS_ARGS    = "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$SCRIPT`""

# Remove tarefa antiga se existir
Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false -ErrorAction SilentlyContinue

$action  = New-ScheduledTaskAction -Execute $PS_EXE -Argument $PS_ARGS -WorkingDirectory $HORUS_DIR
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
    -RestartCount 5 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -StartWhenAvailable

Register-ScheduledTask `
    -TaskName    $TASK_NAME `
    -Action      $action `
    -Trigger     $trigger `
    -Settings    $settings `
    -RunLevel    Highest `
    -Description "Horus RJ: mantém backend, scheduler e túnel Cloudflare sempre ativos." `
    -Force

Write-Host ""
Write-Host "Tarefa '$TASK_NAME' registrada com sucesso."
Write-Host "O watchdog vai subir automaticamente no proximo login."
Write-Host ""
Write-Host "Para iniciar agora sem reiniciar:"
Write-Host "  Start-ScheduledTask -TaskName '$TASK_NAME'"
Write-Host ""
Write-Host "Para ver o status:"
Write-Host "  Get-ScheduledTask -TaskName '$TASK_NAME' | Get-ScheduledTaskInfo"
Write-Host ""
Write-Host "Para remover:"
Write-Host "  Unregister-ScheduledTask -TaskName '$TASK_NAME' -Confirm:`$false"
