# Create RDS backup on EC2 (pg_dump) and download to deploy\database\
# READ-ONLY — does not change AWS RDS data.
#
#   .\deploy\scripts\backup-database-ec2.ps1
#
param(
  [string]$Ec2Host = '13.55.122.55',
  [string]$SshKey = "$env:USERPROFILE\Downloads\service360-api_Key_pem.pem",
  [string]$OutDir = ""
)

$ErrorActionPreference = 'Stop'
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
if (-not $OutDir) {
  $OutDir = Join-Path $repoRoot 'deploy\database'
}
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

if (-not (Test-Path $SshKey)) { throw "SSH key not found: $SshKey" }

$timestamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$remoteName = "backup_rds_$timestamp.sql"
$localFile = Join-Path $OutDir $remoteName
$remoteScript = '/opt/app/deploy/scripts/backup-database-ec2.sh'
$sshTarget = "ubuntu@$Ec2Host"
$sshOpts = @('-i', $SshKey, '-o', 'StrictHostKeyChecking=no')

Write-Host "Uploading backup script to EC2..."
scp @sshOpts (Join-Path $PSScriptRoot 'backup-database-ec2.sh') "${sshTarget}:/tmp/backup-database-ec2.sh"
if ($LASTEXITCODE -ne 0) { throw "scp upload failed (exit $LASTEXITCODE)" }

Write-Host "Running pg_dump on EC2 (read-only)..."
$remoteOut = ssh @sshOpts $sshTarget "chmod +x /tmp/backup-database-ec2.sh && bash /tmp/backup-database-ec2.sh $timestamp"
if ($LASTEXITCODE -ne 0) { throw "ssh backup failed (exit $LASTEXITCODE)" }

$remotePath = ($remoteOut -split "`n" | Where-Object { $_ -match '^/tmp/backup_rds_' } | Select-Object -Last 1).Trim()
if (-not $remotePath) {
  $remotePath = "/tmp/$remoteName"
}

Write-Host "Downloading $remotePath ..."
scp @sshOpts "${sshTarget}:$remotePath" $localFile
if ($LASTEXITCODE -ne 0) { throw "scp download failed (exit $LASTEXITCODE)" }

ssh @sshOpts $sshTarget "rm -f /tmp/backup-database-ec2.sh; sudo rm -f '$remotePath'" | Out-Null

$sizeMb = [math]::Round((Get-Item $localFile).Length / 1MB, 2)
Write-Host "Done. Local backup: $localFile ($sizeMb MB)"
Write-Host "RDS unchanged - read-only export via EC2."
