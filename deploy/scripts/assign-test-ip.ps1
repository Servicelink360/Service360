# Allocate a stable Elastic IP (testing public IP) and attach to your EC2 API server.
param(
  [string]$Region = $(if ($env:AWS_REGION) { $env:AWS_REGION } else { "ap-southeast-2" }),
  [string]$InstanceId = $env:EC2_INSTANCE_ID,
  [string]$Project = "service360-test",
  [int]$ApiPort = 5301
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  throw "Install AWS CLI: https://aws.amazon.com/cli/ then run: aws configure"
}

if (-not $InstanceId) {
  $InstanceId = aws ec2 describe-instances --region $Region `
    --filters "Name=tag:Name,Values=$Project-api" "Name=instance-state-name,Values=running,stopped" `
    --query "Reservations[0].Instances[0].InstanceId" --output text
}
if ($InstanceId -eq "None" -or -not $InstanceId) {
  $InstanceId = Read-Host "EC2 Instance ID (e.g. i-0abc123...)"
}

# Open API port on instance security group
$sgIds = aws ec2 describe-instances --instance-ids $InstanceId --region $Region `
  --query "Reservations[0].Instances[0].SecurityGroups[*].GroupId" --output text
foreach ($sg in ($sgIds -split "\s+")) {
  Write-Host "Allowing TCP $ApiPort on security group $sg (if not already)"
  aws ec2 authorize-security-group-ingress --group-id $sg --protocol tcp --port $ApiPort --cidr 0.0.0.0/0 --region $Region 2>$null | Out-Null
}

# Elastic IP
$existing = aws ec2 describe-addresses --region $Region `
  --filters "Name=instance-id,Values=$InstanceId" `
  --query "Addresses[0].PublicIp" --output text 2>$null

if ($existing -and $existing -ne "None") {
  $testIp = $existing
  Write-Host "Instance already has Elastic IP: $testIp"
} else {
  Write-Host "Allocating Elastic IP..."
  $alloc = aws ec2 allocate-address --domain vpc --region $Region | ConvertFrom-Json
  aws ec2 associate-address --instance-id $InstanceId --allocation-id $alloc.AllocationId --region $Region | Out-Null
  $testIp = $alloc.PublicIp
  aws ec2 create-tags --resources $alloc.AllocationId --tags "Key=Name,Value=$Project-test-ip" --region $Region
  Write-Host "Associated Elastic IP: $testIp"
}

$apiUrl = "http://${testIp}:$ApiPort/"
$adminUrl = $apiUrl

# Update local env hints
$apiEnv = Join-Path $repoRoot "service_link_api-main\.env"
if (Test-Path $apiEnv) {
  (Get-Content $apiEnv -Raw) -replace 'BASE_UPLOAD_URL=.*', "BASE_UPLOAD_URL=$apiUrl" | Set-Content $apiEnv -NoNewline
}

@{
  test_ip = $testIp
  api_url = $apiUrl
  ec2_instance_id = $InstanceId
  region = $Region
} | ConvertTo-Json | Set-Content (Join-Path $repoRoot "deploy\aws-outputs.json")

Write-Host ""
Write-Host "=== Testing URLs (ap-southeast-2) ==="
Write-Host "API:   $apiUrl"
Write-Host "Admin: set REACT_APP_ORDER_API_URL=$apiUrl then build/upload"
Write-Host ""
Write-Host "Saved: deploy\aws-outputs.json"
Write-Host "EC2 console: https://ap-southeast-2.console.aws.amazon.com/ec2/home?region=ap-southeast-2#Instances:"
