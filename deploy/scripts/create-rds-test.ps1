# Step: Create cheap RDS PostgreSQL for testing + optional restore 29__05_2026.sql
param(
  [string]$Region = $(if ($env:AWS_REGION) { $env:AWS_REGION } else { "ap-southeast-2" }),
  [string]$DbId = "service360-test-db",
  [string]$DbPassword = $env:RDS_PASSWORD,
  [switch]$SkipRestore
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  throw "Install AWS CLI, then run: aws configure"
}
if (-not $DbPassword) {
  $sec = Read-Host "RDS master password (min 8 chars)" -AsSecureString
  $DbPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
}

aws sts get-caller-identity --output table | Out-Host
Write-Host "Region: $Region"

$vpcId = aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region $Region
if ($vpcId -eq "None" -or -not $vpcId) { throw "No default VPC in $Region" }

$sgName = "service360-rds-test-sg"
$sgId = aws ec2 describe-security-groups --filters "Name=group-name,Values=$sgName" --query "SecurityGroups[0].GroupId" --output text --region $Region 2>$null
if ($sgId -eq "None" -or -not $sgId) {
  $sgId = aws ec2 create-security-group --group-name $sgName --description "Service360 RDS test" --vpc-id $vpcId --query GroupId --output text --region $Region
  aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 5432 --cidr 0.0.0.0/0 --region $Region 2>$null | Out-Null
  Write-Host "Security group $sgName : $sgId (5432 open for test — tighten later)"
}

$exists = $false
try {
  aws rds describe-db-instances --db-instance-identifier $DbId --region $Region | Out-Null
  $exists = $true
} catch { }

if (-not $exists) {
  Write-Host "Creating RDS $DbId (db.t3.micro, 20GB, ~15 min)..."
  aws rds create-db-instance `
    --db-instance-identifier $DbId `
    --db-instance-class db.t3.micro `
    --engine postgres `
    --engine-version 16 `
    --master-username postgres `
    --master-user-password $DbPassword `
    --allocated-storage 20 `
    --storage-type gp3 `
    --db-name service360 `
    --vpc-security-group-ids $sgId `
    --publicly-accessible `
    --backup-retention-period 1 `
    --no-multi-az `
    --no-deletion-protection `
    --region $Region | Out-Null
  Write-Host "Waiting for RDS..."
  aws rds wait db-instance-available --db-instance-identifier $DbId --region $Region
}

$endpoint = aws rds describe-db-instances --db-instance-identifier $DbId --query "DBInstances[0].Endpoint.Address" --output text --region $Region
Write-Host ""
Write-Host "RDS endpoint: $endpoint"
Write-Host "Database:     service360"
Write-Host "User:         postgres"

@{
  rds_host = $endpoint
  rds_db = "service360"
  rds_user = "postgres"
  region = $Region
  db_instance_id = $DbId
} | ConvertTo-Json | Set-Content (Join-Path $repoRoot "deploy\aws-outputs.json")

if (-not $SkipRestore) {
  $psql = Get-Command psql -ErrorAction SilentlyContinue
  if (-not $psql) {
    Write-Host "Install PostgreSQL client (psql), then run:"
    Write-Host "  `$env:RDS_HOST='$endpoint'; `$env:RDS_PASSWORD='...'; .\deploy\scripts\restore-database.ps1"
  } else {
    $env:RDS_HOST = $endpoint
    $env:RDS_PASSWORD = $DbPassword
    & (Join-Path $PSScriptRoot "restore-database.ps1")
  }
}

Write-Host ""
Write-Host "HeidiSQL: host=$endpoint port=5432 user=postgres database=service360"
Write-Host "API .env: DATABASE_HOST=$endpoint"
