# Restore PostgreSQL from deploy/database/29__05_2026.sql (or C:\app_pc\29__05_2026.sql)
param(
  [string]$RdsHost = $env:RDS_HOST,
  [string]$RdsUser = $(if ($env:RDS_USER) { $env:RDS_USER } else { "postgres" }),
  [string]$RdsPassword = $env:RDS_PASSWORD,
  [string]$Database = $(if ($env:RDS_DB) { $env:RDS_DB } else { "service360" }),
  [string]$DumpPath = $env:DATABASE_DUMP_PATH
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

if (-not $DumpPath) {
  $candidates = @(
    (Join-Path $repoRoot "deploy\database\29__05_2026.sql"),
    (Join-Path $repoRoot "29__05_2026.sql"),
    "C:\app_pc\29__05_2026.sql"
  )
  foreach ($p in $candidates) {
    if (Test-Path $p) { $DumpPath = $p; break }
  }
}

if (-not $DumpPath -or -not (Test-Path $DumpPath)) {
  throw "Dump not found. Set DATABASE_DUMP_PATH or place 29__05_2026.sql in deploy/database/"
}
if (-not $RdsHost) { throw "Set RDS_HOST (RDS endpoint)." }
if (-not $RdsPassword) { throw "Set RDS_PASSWORD." }

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) { throw "psql not found. Install PostgreSQL client tools." }

$env:PGPASSWORD = $RdsPassword
Write-Host "Restoring $DumpPath -> $RdsHost / $Database"

$sslCert = $env:RDS_SSL_CERT
if (-not $sslCert) {
  $sslCert = Join-Path $repoRoot "deploy\global-bundle.pem"
}
if (-not (Test-Path $sslCert)) {
  Write-Host "Downloading RDS SSL certificate..."
  $deployDir = Join-Path $repoRoot "deploy"
  New-Item -ItemType Directory -Force -Path $deployDir | Out-Null
  Invoke-WebRequest -Uri "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem" -OutFile $sslCert
}

$env:PGSSLMODE = "verify-full"
$env:PGSSLROOTCERT = $sslCert
$env:PGHOST = $RdsHost
# Prefer IPv4 public IP when RDS is publicly accessible (avoids broken IPv6 paths on Windows)
try {
  $resolved = Resolve-DnsName $RdsHost -Type A -Server 8.8.8.8 -ErrorAction Stop | Where-Object { $_.IPAddress -match '^\d+\.\d+\.\d+\.\d+$' } | Select-Object -First 1
  if ($resolved.IPAddress) { $env:PGHOSTADDR = $resolved.IPAddress }
} catch { }
$psqlArgs = @("-p", "5432", "-U", $RdsUser)
if (-not $env:PGHOSTADDR) { $psqlArgs = @("-h", $RdsHost) + $psqlArgs }

& psql @psqlArgs -d postgres -v ON_ERROR_STOP=1 -c "SELECT 1 FROM pg_database WHERE datname = '$Database'" 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  & psql @psqlArgs -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $Database"
}

# pg_dump 18 may emit \restrict; strip for older RDS if restore fails
$tempSql = Join-Path $env:TEMP "service360-restore.sql"
(Get-Content -LiteralPath $DumpPath -Raw) `
  -replace '\\restrict[^\r\n]*', '' `
  -replace '\\unrestrict[^\r\n]*', '' | Set-Content -LiteralPath $tempSql -Encoding utf8

& psql @psqlArgs -d $Database -v ON_ERROR_STOP=0 -f $tempSql
if ($LASTEXITCODE -ne 0) {
  Write-Warning "Restore reported errors (often safe on re-run). Check RDS logs."
}

Write-Host "Applying migrations..."
$migrationsDir = Join-Path $repoRoot "service_link_api-main\database\migrations"
Get-ChildItem $migrationsDir -Filter "*.sql" | Sort-Object Name | ForEach-Object {
  Write-Host "  $($_.Name)"
  & psql @psqlArgs -d $Database -v ON_ERROR_STOP=0 -f $_.FullName
}

Write-Host "Database restore finished."
