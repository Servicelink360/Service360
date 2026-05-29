# One command: AWS infra + DB restore (29__05_2026.sql) + admin to S3
param(
  [string]$Region = "ap-southeast-2",
  [string]$DbPassword = $env:RDS_PASSWORD,
  [switch]$InfraOnly,
  [switch]$SkipInfra
)

$scripts = Join-Path $PSScriptRoot "."

if (-not $SkipInfra) {
  & "$scripts\setup-aws-test.ps1" -Region $Region -DbPassword $DbPassword
}
if ($InfraOnly) { return }

& "$scripts\deploy-admin.ps1"
