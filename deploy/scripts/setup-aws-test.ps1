# Creates RDS PostgreSQL + EC2 for Service360 test. Requires AWS CLI v2 and credentials.
param(
  [string]$Region = $(if ($env:AWS_REGION) { $env:AWS_REGION } else { "ap-southeast-2" }),
  [string]$Project = "service360-test",
  [string]$DbPassword = $env:RDS_PASSWORD,
  [string]$KeyName = $env:EC2_KEY_NAME,
  [switch]$SkipDbRestore,
  [switch]$SkipEc2
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  throw "AWS CLI not found. Install: https://aws.amazon.com/cli/"
}
if (-not $DbPassword) {
  $DbPassword = Read-Host "RDS master password (min 8 chars)" -AsSecureString
  $DbPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($DbPassword))
}

$accountId = (aws sts get-caller-identity --query Account --output text)
Write-Host "AWS account: $accountId  Region: $Region"

# Default VPC
$vpcId = aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region $Region
if ($vpcId -eq "None" -or -not $vpcId) { throw "No default VPC in $Region. Create a VPC first." }
$subnetIds = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$vpcId" --query "Subnets[*].SubnetId" --output text --region $Region
$subnetList = $subnetIds -split "\s+"
$sgName = "$Project-sg"

# Security group
$sgId = aws ec2 describe-security-groups --filters "Name=group-name,Values=$sgName" --query "SecurityGroups[0].GroupId" --output text --region $Region 2>$null
if ($sgId -eq "None" -or -not $sgId) {
  $sgId = aws ec2 create-security-group --group-name $sgName --description "Service360 test" --vpc-id $vpcId --query GroupId --output text --region $Region
  aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $Region | Out-Null
  aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 5301 --cidr 0.0.0.0/0 --region $Region | Out-Null
  aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 5432 --cidr 0.0.0.0/0 --region $Region | Out-Null
}
Write-Host "Security group: $sgId"

# RDS
$dbId = "$Project-db"
$dbExists = aws rds describe-db-instances --db-instance-identifier $dbId --region $Region 2>$null
if (-not $dbExists) {
  Write-Host "Creating RDS ($dbId)..."
  aws rds create-db-instance `
    --db-instance-identifier $dbId `
    --db-instance-class db.t3.micro `
    --engine postgres `
    --engine-version 16.6 `
    --master-username postgres `
    --master-user-password $DbPassword `
    --allocated-storage 20 `
    --db-name service360 `
    --vpc-security-group-ids $sgId `
    --publicly-accessible `
    --backup-retention-period 0 `
    --no-multi-az `
    --region $Region | Out-Null
  Write-Host "Waiting for RDS (10-15 min)..."
  aws rds wait db-instance-available --db-instance-identifier $dbId --region $Region
}

$rdsHost = aws rds describe-db-instances --db-instance-identifier $dbId --query "DBInstances[0].Endpoint.Address" --output text --region $Region
Write-Host "RDS endpoint: $rdsHost"

if (-not $SkipDbRestore) {
  $env:RDS_HOST = $rdsHost
  $env:RDS_PASSWORD = $DbPassword
  & (Join-Path $PSScriptRoot "restore-database.ps1")
}

if ($SkipEc2) { return }

# S3 admin bucket
$bucket = "$Project-admin-$accountId".ToLower()
if (-not (aws s3api head-bucket --bucket $bucket 2>$null)) {
  aws s3 mb "s3://$bucket" --region $Region
  aws s3 website "s3://$bucket" --index-document index.html --error-document index.html
  $policy = @"
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicRead",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::$bucket/*"
  }]
}
"@
  $policy | Set-Content "$env:TEMP\s360-policy.json"
  aws s3api put-bucket-policy --bucket $bucket --policy (Get-Content "$env:TEMP\s360-policy.json" -Raw)
}
Write-Host "Admin S3 bucket: $bucket  Website: http://$bucket.s3-website-$Region.amazonaws.com"

# EC2
$ami = aws ec2 describe-images --owners amazon --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" "Name=state,Values=available" --query "sort_by(Images, &CreationDate)[-1].ImageId" --output text --region $Region
$userData = @"
#!/bin/bash
set -e
apt-get update -y
apt-get install -y docker.io docker-compose-plugin git
systemctl enable docker && systemctl start docker
cd /opt
git clone https://github.com/Servicelink360/Service360.git app
cd app
sed -i 's/DATABASE_HOST=.*/DATABASE_HOST=$rdsHost/' service_link_api-main/.env || true
sed -i 's/DATABASE_PASSWORD=.*/DATABASE_PASSWORD=$DbPassword/' service_link_api-main/.env || true
sed -i 's/REDIS_IP=.*/REDIS_IP=redis/' service_link_api-main/.env || true
docker compose -f deploy/docker-compose.aws-test.yml up -d --build
"@ -replace "`r",""

$userDataFile = Join-Path $env:TEMP "s360-userdata.sh"
[System.IO.File]::WriteAllText($userDataFile, $userData)
$userDataB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($userData))

$instanceParams = @(
  "run-instances",
  "--image-id", $ami,
  "--instance-type", "t3.small",
  "--security-group-ids", $sgId,
  "--subnet-id", $subnetList[0],
  "--user-data", $userDataB64,
  "--tag-specifications", "ResourceType=instance,Tags=[{Key=Name,Value=$Project-api}]",
  "--region", $Region,
  "--query", "Instances[0].InstanceId",
  "--output", "text"
)
if ($KeyName) { $instanceParams += @("--key-name", $KeyName) }

$instanceId = aws ec2 @instanceParams
Write-Host "EC2 instance: $instanceId (boot + docker build ~5 min)"
aws ec2 wait instance-running --instance-ids $instanceId --region $Region

# Stable testing IP (Elastic IP) — does not change when instance reboots
Write-Host "Allocating Elastic IP for testing..."
$alloc = aws ec2 allocate-address --domain vpc --region $Region | ConvertFrom-Json
aws ec2 associate-address --instance-id $instanceId --allocation-id $alloc.AllocationId --region $Region | Out-Null
aws ec2 create-tags --resources $alloc.AllocationId --tags "Key=Name,Value=$Project-test-ip" --region $Region | Out-Null
$publicIp = $alloc.PublicIp
aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 5301 --cidr 0.0.0.0/0 --region $Region 2>$null | Out-Null

Write-Host ""
Write-Host "=== Service360 test environment ==="
Write-Host "RDS:      $rdsHost"
Write-Host "Test IP:  $publicIp  (Elastic IP)"
Write-Host "API:      http://${publicIp}:5301/"
Write-Host "Admin S3: http://$bucket.s3-website-$Region.amazonaws.com"
Write-Host ""
Write-Host "Build admin locally, then upload:"
Write-Host "  cd service_link_admin-main"
Write-Host "  set REACT_APP_ORDER_API_URL=http://${publicIp}:5301/"
Write-Host "  npm run build"
Write-Host "  aws s3 sync build/ s3://$bucket/ --delete"

# Save outputs
@{
  rds_host = $rdsHost
  test_ip = $publicIp
  api_url = "http://${publicIp}:5301/"
  admin_bucket = $bucket
  ec2_instance_id = $instanceId
  region = $Region
} | ConvertTo-Json | Set-Content (Join-Path $repoRoot "deploy\aws-outputs.json")
Write-Host "Saved deploy/aws-outputs.json"
