# READ-ONLY: download AWS RDS PostgreSQL to a local .sql file.
# Uses pg_dump only - does NOT write, restore, migrate, or change RDS in any way.
#
#   .\deploy\scripts\backup-database.ps1
#
# Output: deploy\database\backup_rds_YYYY-MM-DD_HHmm.sql

param(
  [string]$RdsHost = $env:RDS_HOST,
  [string]$RdsUser = $(if ($env:RDS_USER) { $env:RDS_USER } else { "postgres" }),
  [string]$RdsPassword = $env:RDS_PASSWORD,
  [string]$Database = $(if ($env:RDS_DB) { $env:RDS_DB } else { "service360" }),
  [string]$OutDir = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$apiEnvProd = Join-Path $repoRoot "service_link_api-main\.env.prod"

if (-not $RdsHost -and (Test-Path $apiEnvProd)) {
  Get-Content $apiEnvProd | ForEach-Object {
    if ($_ -match '^\s*DATABASE_HOST=(.+)$') { $RdsHost = $Matches[1].Trim() }
    if ($_ -match '^\s*DATABASE_PASSWORD=(.+)$' -and -not $RdsPassword) { $RdsPassword = $Matches[1].Trim() }
    if ($_ -match '^\s*DATABASE_USERNAME=(.+)$' -and -not $env:RDS_USER) { $RdsUser = $Matches[1].Trim() }
    if ($_ -match '^\s*DATABASE_DB_NAME=(.+)$' -and -not $env:RDS_DB) { $Database = $Matches[1].Trim() }
  }
}

if (-not $OutDir) {
  $OutDir = Join-Path $repoRoot "deploy\database"
}
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$date = Get-Date -Format "yyyy-MM-dd_HHmm"
$outFile = Join-Path $OutDir "backup_rds_$date.sql"

if (-not $RdsHost) { throw "RDS host not set. Set RDS_HOST or DATABASE_HOST in .env.prod." }
if (-not $RdsPassword) { throw "RDS password not set. Set RDS_PASSWORD or DATABASE_PASSWORD in .env.prod." }

function Find-PgDump {
  $cmd = Get-Command pg_dump -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidates = @(
    "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"
  )
  foreach ($p in $candidates) {
    if (Test-Path $p) { return $p }
  }
  throw "pg_dump not found. Install PostgreSQL client tools or add pg_dump to PATH."
}

$pgDump = Find-PgDump
Write-Host "READ-ONLY export (pg_dump) - AWS RDS is not modified."
Write-Host "Source: $RdsHost / $Database"
Write-Host "Target: $outFile"

$env:PGPASSWORD = $RdsPassword
$env:PGSSLMODE = "require"

& $pgDump `
  -h $RdsHost `
  -p 5432 `
  -U $RdsUser `
  -d $Database `
  --no-owner `
  --no-acl `
  -F p `
  -f $outFile

if ($LASTEXITCODE -ne 0) {
  Remove-Item $outFile -ErrorAction SilentlyContinue
  throw "pg_dump failed (exit $LASTEXITCODE). RDS may block your IP - use EC2 jump or AWS RDS snapshot in console."
}

$sizeMb = [math]::Round((Get-Item $outFile).Length / 1MB, 2)
Write-Host "Done. Backup saved locally: $outFile ($sizeMb MB)"
Write-Host "RDS unchanged - this was a read-only download."
