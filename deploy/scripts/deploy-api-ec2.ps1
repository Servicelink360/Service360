# Creates EC2 + Elastic IP and runs API+Redis via Docker (needs: aws configure)
param(
  [string]$Region = "ap-southeast-2",
  [string]$Project = "service360-api",
  [string]$KeyName = $env:EC2_KEY_NAME
)

$ErrorActionPreference = "Stop"
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) { throw "Run: aws configure" }
aws sts get-caller-identity | Out-Host

$vpcId = aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region $Region
$subnet = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$vpcId" --query "Subnets[0].SubnetId" --output text --region $Region
$sgName = "$Project-sg"
$sgId = aws ec2 describe-security-groups --filters "Name=group-name,Values=$sgName" --query "SecurityGroups[0].GroupId" --output text --region $Region 2>$null
if ($sgId -eq "None" -or -not $sgId) {
  $sgId = aws ec2 create-security-group --group-name $sgName --description "Service360 API" --vpc-id $vpcId --query GroupId --output text --region $Region
  aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $Region 2>$null | Out-Null
  aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 5301 --cidr 0.0.0.0/0 --region $Region 2>$null | Out-Null
}

$ami = aws ec2 describe-images --owners amazon --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" --query "sort_by(Images, &CreationDate)[-1].ImageId" --output text --region $Region
$userData = @'
#!/bin/bash
set -e
apt-get update -y
apt-get install -y docker.io docker-compose-plugin git
systemctl enable docker && systemctl start docker
git clone https://github.com/Servicelink360/Service360.git /opt/app
cd /opt/app
docker compose -f deploy/docker-compose.aws-test.yml up -d --build
'@

$userDataB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($userData.Replace("`r","")))
$params = @("run-instances", "--image-id", $ami, "--instance-type", "t3.small", "--security-group-ids", $sgId, "--subnet-id", $subnet, "--user-data", $userDataB64, "--tag-specifications", "ResourceType=instance,Tags=[{Key=Name,Value=$Project}]", "--region", $Region, "--query", "Instances[0].InstanceId", "--output", "text")
if ($KeyName) { $params += @("--key-name", $KeyName) }
$instanceId = aws ec2 @params
Write-Host "Instance: $instanceId — waiting..."
aws ec2 wait instance-running --instance-ids $instanceId --region $Region
$alloc = aws ec2 allocate-address --domain vpc --region $Region | ConvertFrom-Json
aws ec2 associate-address --instance-id $instanceId --allocation-id $alloc.AllocationId --region $Region | Out-Null
$ip = $alloc.PublicIp
Write-Host "API URL: http://${ip}:5301/"
Write-Host "Wait 5-10 min for docker build, then test in browser."
@{
  api_url = "http://${ip}:5301/"
  ec2_instance_id = $instanceId
  elastic_ip = $ip
} | ConvertTo-Json | Set-Content (Join-Path (Split-Path $PSScriptRoot -Parent) "aws-outputs.json")
