# Restore 29__05_2026.sql to AWS RDS (uses your local PostgreSQL 18 psql)
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
if (-not (Test-Path $psql)) {
  $psql = (Get-Command psql -ErrorAction SilentlyContinue).Source
}
if (-not $psql) { throw "psql not found. Edit path in this script." }

$hostName = $env:RDS_HOST
if (-not $hostName) {
  $hostName = Read-Host "RDS endpoint (e.g. service360-test-db.xxxx.ap-southeast-2.rds.amazonaws.com)"
}
$password = $env:RDS_PASSWORD
if (-not $password) {
  $sec = Read-Host "RDS password" -AsSecureString
  $password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
}

$env:RDS_HOST = $hostName
$env:RDS_PASSWORD = $password
$env:PATH = "C:\Program Files\PostgreSQL\18\bin;" + $env:PATH

& (Join-Path $PSScriptRoot "restore-database.ps1")
