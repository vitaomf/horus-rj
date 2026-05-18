# scripts/backup_horus.ps1
# Snapshot completo do Horus antes de alteracoes importantes.
# Uso: .\scripts\backup_horus.ps1 [-Tag "descricao-curta"]
#
# Cria:
#   backups/<timestamp>[_<tag>]/transparencia_rj.db
#   backups/<timestamp>[_<tag>]/frontend_src.zip
#   backups/<timestamp>[_<tag>]/META.txt   (branch atual, ultimo commit, contagens do banco)

param(
    [string]$Tag = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$nomeBackup = if ($Tag) { "${timestamp}_$Tag" } else { $timestamp }
$dirBackup  = Join-Path (Join-Path $root "backups") $nomeBackup
New-Item -ItemType Directory -Path $dirBackup -Force | Out-Null

Write-Host "Horus Backup -> $dirBackup" -ForegroundColor Cyan

# 1. Banco SQLite
$dbSrc = Join-Path $root "transparencia_rj.db"
if (Test-Path $dbSrc) {
    Copy-Item $dbSrc (Join-Path $dirBackup "transparencia_rj.db")
    $dbSize = (Get-Item $dbSrc).Length / 1KB
    Write-Host ("[OK] banco copiado ({0:N0} KB)" -f $dbSize) -ForegroundColor Green
} else {
    Write-Host "[!] banco transparencia_rj.db nao encontrado" -ForegroundColor Yellow
}

# 2. Snapshot do frontend/src (zip)
$srcDir = Join-Path $root "frontend\src"
$zipDst = Join-Path $dirBackup "frontend_src.zip"
if (Test-Path $srcDir) {
    Compress-Archive -Path "$srcDir\*" -DestinationPath $zipDst -Force
    $zipSize = (Get-Item $zipDst).Length / 1KB
    Write-Host ("[OK] frontend/src zipado ({0:N0} KB)" -f $zipSize) -ForegroundColor Green
}

# 3. Metadados
$meta = @()
$meta += "Horus backup snapshot"
$meta += "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$meta += "Tag: $Tag"
$meta += ""
$meta += "--- git ---"
try {
    $branch = git rev-parse --abbrev-ref HEAD 2>$null
    $commit = git log -1 --pretty=format:'%h %s' 2>$null
    $status = git status --short 2>$null
    $meta += "Branch: $branch"
    $meta += "Ultimo commit: $commit"
    $meta += ""
    $meta += "Arquivos modificados:"
    $meta += ($status -join "`n")
} catch {
    $meta += "[git indisponivel]"
}

$meta += ""
$meta += "--- banco ---"
try {
    $py = @"
import sqlite3
db = sqlite3.connect(r'$dbSrc')
cur = db.cursor()
for tabela in ('emendas','politicos','contratos','campanhas','doadores'):
    try:
        cur.execute(f'SELECT COUNT(*) FROM {tabela}')
        print(f'{tabela}: {cur.fetchone()[0]}')
    except Exception:
        print(f'{tabela}: -')
db.close()
"@
    $contagens = python -c $py 2>$null
    $meta += ($contagens -join "`n")
} catch {
    $meta += "[python indisponivel]"
}

$meta -join "`n" | Out-File -Encoding utf8 (Join-Path $dirBackup "META.txt")
Write-Host "[OK] META.txt salvo" -ForegroundColor Green

Write-Host ""
Write-Host "Backup concluido: $dirBackup" -ForegroundColor Cyan
