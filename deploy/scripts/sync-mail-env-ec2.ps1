# Sync Brevo mail / APP_URL vars to EC2 .env.prod if missing, then recreate API container.
param(
  [string]$Ec2Host = '13.55.122.55',
  [string]$SshKey = "$env:USERPROFILE\Downloads\service360-api_Key_pem.pem",
  [string]$EnvProd = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..\..\service_link_api-main')).Path '.env.prod')
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path $SshKey)) { throw "SSH key not found: $SshKey" }
if (-not (Test-Path $EnvProd)) { throw "Missing: $EnvProd" }

$mailBlock = @(
  'APP_URL', 'SUPPORT_EMAIL', 'MAIL_FROM', 'MAIL_FROM_NAME', 'BREVO_API_KEY'
)
$lines = Get-Content $EnvProd | Where-Object { $_ -match '^\s*$' -or ($_ -match '^([^#=]+)=' -and $mailBlock -contains $Matches[1]) }
if (-not $lines.Count) { throw 'No mail/APP_URL lines in .env.prod' }

$remoteFile = '/opt/app/service_link_api-main/.env.prod'
$ssh = @('-i', $SshKey, '-o', 'StrictHostKeyChecking=no', "ubuntu@$Ec2Host")

foreach ($line in $lines) {
  if ($line -notmatch '^([A-Z_]+)=(.*)$') { continue }
  $key = $Matches[1]
  $val = $Matches[2]
  if ($key -eq 'BREVO_API_KEY' -and [string]::IsNullOrWhiteSpace($val)) {
    Write-Host "Skip empty BREVO_API_KEY (set in .env.prod before sync)" -ForegroundColor Yellow
    continue
  }
  $escaped = $line -replace "'", "'\''"
  $cmd = "grep -q '^${key}=' $remoteFile 2>/dev/null || echo '$escaped' | sudo tee -a $remoteFile >/dev/null"
  ssh @ssh $cmd
  if ($LASTEXITCODE -ne 0) { throw "ssh failed for $key" }
}

# Update BREVO_API_KEY / MAIL_FROM_NAME when already present (sed)
foreach ($line in $lines) {
  if ($line -notmatch '^([A-Z_]+)=(.*)$') { continue }
  $key = $Matches[1]
  $val = $Matches[2]
  if ([string]::IsNullOrWhiteSpace($val)) { continue }
  if ($key -notin @('BREVO_API_KEY', 'MAIL_FROM', 'MAIL_FROM_NAME', 'APP_URL', 'SUPPORT_EMAIL')) { continue }
  $escapedVal = $val -replace "'", "'\''"
  $sedCmd = "sudo sed -i 's|^${key}=.*|${key}=${escapedVal}|' $remoteFile"
  ssh @ssh $sedCmd
}

ssh @ssh 'cd /opt/app/deploy && sudo docker compose -f docker-compose.aws-test.yml up -d api --force-recreate'
Write-Host 'Brevo mail env synced and API container recreated.'
