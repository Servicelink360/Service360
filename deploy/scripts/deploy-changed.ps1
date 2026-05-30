# Build ONLY what changed, copy compiled output to EC2 (~30 sec on server). No full docker rebuild.
param(
  [string]$Ec2Host = "13.55.122.55",
  [string]$SshKey = "$env:USERPROFILE\Downloads\service360-api_Key_pem.pem",
  [ValidateSet('auto', 'api', 'admin', 'both')]
  [string]$Target = 'auto',
  [string]$ApiUrl = "http://13.55.122.55:5301/"
)

$ErrorActionPreference = 'Stop'
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$artifactDir = Join-Path $env:TEMP "service360-deploy-artifacts"
$sshOpts = @('-i', $SshKey, '-o', 'StrictHostKeyChecking=no')

if (-not (Test-Path $SshKey)) { throw "SSH key not found: $SshKey" }

function Get-ChangedServices {
  param([string]$Mode)
  if ($Mode -eq 'both') { return @('api', 'admin') }
  if ($Mode -ne 'auto') { return @($Mode) }

  $files = @()
  $files += git -C $repoRoot diff --name-only origin/main...HEAD 2>$null
  if (-not $files) { $files += git -C $repoRoot diff --name-only HEAD~1 HEAD 2>$null }
  if (-not $files) {
    $files += git -C $repoRoot status --porcelain | ForEach-Object { ($_ -split '\s+', 2)[1] }
  }

  $services = [System.Collections.Generic.List[string]]::new()
  if ($files | Where-Object { $_ -match '^service_link_api-main/' }) { $services.Add('api') }
  if ($files | Where-Object { $_ -match '^service_link_admin-main/' }) { $services.Add('admin') }
  return @($services)
}

function Build-Api {
  Write-Host '=== Build API (changed files only → dist) ===' -ForegroundColor Cyan
  Push-Location (Join-Path $repoRoot 'service_link_api-main')
  $env:PUPPETEER_SKIP_DOWNLOAD = 'true'
  if (-not (Test-Path 'node_modules')) { npm ci --legacy-peer-deps }
  npm run build
  Pop-Location

  $apiOut = Join-Path $artifactDir 'api'
  Remove-Item $apiOut -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path (Join-Path $apiOut 'dist') -Force | Out-Null
  Copy-Item -Recurse (Join-Path $repoRoot 'service_link_api-main\dist\*') (Join-Path $apiOut 'dist')
  Copy-Item (Join-Path $repoRoot 'service_link_api-main\template.html') $apiOut
  $tar = Join-Path $env:TEMP 'api-artifact.tar.gz'
  if (Get-Command tar -ErrorAction SilentlyContinue) {
    tar czf $tar -C $artifactDir api
  } else {
    throw 'tar not found (use Git Bash or Windows 10+ tar)'
  }
  return $tar
}

function Build-Admin {
  Write-Host '=== Build Admin (changed files only → static bundle) ===' -ForegroundColor Cyan
  $adminDir = Join-Path $repoRoot 'service_link_admin-main'
  Push-Location $adminDir
  $env:REACT_APP_ORDER_API_URL = $ApiUrl
  $env:REACT_APP_MODE = 'PROD'
  $env:NODE_OPTIONS = '--openssl-legacy-provider --max_old_space_size=4096'
  $env:CI = 'false'
  $env:DISABLE_ESLINT_PLUGIN = 'true'
  $env:GENERATE_SOURCEMAP = 'false'
  @(
    "REACT_APP_ORDER_API_URL=$ApiUrl"
    'REACT_APP_MODE=PROD'
    'GENERATE_SOURCEMAP=false'
  ) | Set-Content '.env.production' -Encoding utf8
  if (-not (Test-Path 'node_modules')) { npm ci --legacy-peer-deps }
  if (-not (Test-Path 'ckeditor5\node_modules')) {
    Push-Location ckeditor5; npm install; npm run build; Pop-Location
  }
  npm run build
  Pop-Location

  $tar = Join-Path $env:TEMP 'admin-artifact.tar.gz'
  if (Get-Command tar -ErrorAction SilentlyContinue) {
    tar czf $tar -C $adminDir build
  } else {
    throw 'tar not found'
  }
  return $tar
}

function Deploy-Artifact {
  param([string]$Service, [string]$TarPath)
  Write-Host "=== Upload & apply $Service (~30 sec on server) ===" -ForegroundColor Green
  scp @sshOpts $TarPath "ubuntu@${Ec2Host}:/tmp/$([IO.Path]::GetFileName($TarPath))"
  $remote = @"
set -e
sudo mkdir -p /tmp/deploy-artifacts
sudo rm -rf /tmp/deploy-artifacts/$Service
if [ '$Service' = 'admin' ]; then
  sudo mkdir -p /tmp/deploy-artifacts/admin
  sudo tar xzf /tmp/$([IO.Path]::GetFileName($TarPath)) -C /tmp/deploy-artifacts/admin
else
  sudo tar xzf /tmp/$([IO.Path]::GetFileName($TarPath)) -C /tmp/deploy-artifacts
fi
sudo bash /opt/app/deploy/ec2-apply-artifacts.sh $Service
"@
  ssh @sshOpts "ubuntu@$Ec2Host" $remote
}

$services = Get-ChangedServices -Mode $Target
if (-not $services -or $services.Count -eq 0) {
  Write-Host 'Nothing to deploy (no api/admin file changes detected). Use -Target api|admin|both to force.' -ForegroundColor Yellow
  exit 0
}

Write-Host "Deploying: $($services -join ', ')" -ForegroundColor Green
New-Item -ItemType Directory -Path $artifactDir -Force | Out-Null

foreach ($svc in $services) {
  switch ($svc) {
    'api' { Deploy-Artifact -Service api -TarPath (Build-Api) }
    'admin' { Deploy-Artifact -Service admin -TarPath (Build-Admin) }
  }
}

Write-Host 'Done. Only changed service(s) were built and copied — no full server rebuild.' -ForegroundColor Green
