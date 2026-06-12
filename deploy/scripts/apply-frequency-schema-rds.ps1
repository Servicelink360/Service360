# Apply frequency schema to AWS RDS only (ALTER/UPDATE - does not drop data).
#   .\deploy\scripts\apply-frequency-schema-rds.ps1

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$sqlFiles = @(
  (Join-Path $repoRoot "deploy\database\034_ground_maintenance_schedules-aws.sql")
  (Join-Path $repoRoot "deploy\database\migrations-frequency-aws.sql")
)
$apiEnvProd = Join-Path $repoRoot "service_link_api-main\.env.prod"

foreach ($f in $sqlFiles) {
  if (-not (Test-Path $f)) { throw "Missing $f" }
}

$RdsHost = $env:RDS_HOST
$RdsUser = if ($env:RDS_USER) { $env:RDS_USER } else { "postgres" }
$RdsPassword = $env:RDS_PASSWORD
$Database = if ($env:RDS_DB) { $env:RDS_DB } else { "service360" }

if (-not $RdsHost -and (Test-Path $apiEnvProd)) {
  Get-Content $apiEnvProd | ForEach-Object {
    if ($_ -match '^\s*DATABASE_HOST=(.+)$') { $RdsHost = $Matches[1].Trim() }
    if ($_ -match '^\s*DATABASE_PASSWORD=(.+)$' -and -not $RdsPassword) { $RdsPassword = $Matches[1].Trim() }
    if ($_ -match '^\s*DATABASE_USERNAME=(.+)$') { $RdsUser = $Matches[1].Trim() }
    if ($_ -match '^\s*DATABASE_DB_NAME=(.+)$') { $Database = $Matches[1].Trim() }
  }
}

if (-not $RdsHost -or -not $RdsPassword) { throw "Set RDS_HOST/RDS_PASSWORD or .env.prod DATABASE_*" }

function Find-Psql {
  $cmd = Get-Command psql -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidates = @(
    "C:\Program Files\PostgreSQL\18\bin\psql.exe",
    "C:\Program Files\PostgreSQL\17\bin\psql.exe"
  )
  foreach ($p in $candidates) { if (Test-Path $p) { return $p } }
  throw "psql not found"
}

$psql = Find-Psql
$env:PGPASSWORD = $RdsPassword
$env:PGSSLMODE = "require"

Write-Host "Applying frequency + GM schedule schema to RDS $RdsHost / $Database ..."
foreach ($sqlFile in $sqlFiles) {
  Write-Host "  -> $(Split-Path -Leaf $sqlFile)"
  & $psql -h $RdsHost -p 5432 -U $RdsUser -d $Database -v ON_ERROR_STOP=1 -f $sqlFile
  if ($LASTEXITCODE -ne 0) { throw "Migration failed: $sqlFile (exit $LASTEXITCODE)" }
}

Write-Host "Schema applied on RDS."
