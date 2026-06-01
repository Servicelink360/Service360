# Build ONLY what changed, copy compiled output to EC2 (~30 sec on server). No full docker rebuild.
param(
  [string]$Ec2Host = "13.55.122.55",
  [string]$SshKey = "$env:USERPROFILE\Downloads\service360-api_Key_pem.pem",
  [ValidateSet('auto', 'api', 'admin', 'both')]
  [string]$Target = 'auto',
  [string]$ApiUrl = "https://api.service360.com.au/"
)

$ErrorActionPreference = 'Stop'
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$artifactDir = Join-Path $env:TEMP "service360-deploy-artifacts"
$sshOpts = @('-i', $SshKey, '-o', 'StrictHostKeyChecking=no')

if (-not (Test-Path $SshKey)) { throw "SSH key not found: $SshKey" }

function Invoke-Npm {
  param([string[]]$NpmArgs, [string]$FailureMessage)
  # npm on Windows writes banners to stdout *after* the process exits; if that leaks to the
  # output stream it becomes extra scp/ssh arguments (" > servicelink@0.0.1 prebuild").
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    & npm @NpmArgs 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "$FailureMessage (exit $LASTEXITCODE)"
    }
  } finally {
    $ErrorActionPreference = $prevEap
  }
}

function Invoke-Scp {
  param([string]$LocalPath, [string]$RemoteDest)
  if (-not (Test-Path $LocalPath)) {
    throw "Artifact missing, cannot upload: $LocalPath"
  }
  scp @sshOpts $LocalPath $RemoteDest
  if ($LASTEXITCODE -ne 0) {
    throw "scp failed uploading $LocalPath -> $RemoteDest (exit $LASTEXITCODE)"
  }
}

function Invoke-Ssh {
  param([string]$RemoteCommand)
  ssh @sshOpts "ubuntu@$Ec2Host" $RemoteCommand
  if ($LASTEXITCODE -ne 0) {
    throw "ssh failed (exit $LASTEXITCODE)"
  }
}

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
  Write-Host '=== Build API (changed files only -> dist) ===' -ForegroundColor Cyan
  Push-Location (Join-Path $repoRoot 'service_link_api-main')
  $env:PUPPETEER_SKIP_DOWNLOAD = 'true'
  if (-not (Test-Path 'node_modules')) { Invoke-Npm @('ci', '--legacy-peer-deps') 'API npm ci failed' }
  Invoke-Npm @('run', 'build') 'API npm build failed'
  Pop-Location

  $mainJs = Join-Path $repoRoot 'service_link_api-main\dist\src\main.js'
  if (-not (Test-Path $mainJs)) {
    throw "API build output missing: $mainJs"
  }

  $apiOut = Join-Path $artifactDir 'api'
  Remove-Item $apiOut -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path (Join-Path $apiOut 'dist') -Force | Out-Null
  Copy-Item -Recurse (Join-Path $repoRoot 'service_link_api-main\dist\*') (Join-Path $apiOut 'dist')
  Copy-Item (Join-Path $repoRoot 'service_link_api-main\template.html') $apiOut
  $tar = Join-Path $env:TEMP 'api-artifact.tar.gz'
  if (Get-Command tar -ErrorAction SilentlyContinue) {
    tar czf $tar -C $artifactDir api
    if ($LASTEXITCODE -ne 0) { throw "tar failed creating $tar (exit $LASTEXITCODE)" }
  } else {
    throw 'tar not found (use Git Bash or Windows 10+ tar)'
  }
  if ((Get-Item $tar).Length -lt 1000) {
    throw "Artifact tar too small or empty: $tar"
  }
  return $tar
}

function Build-Admin {
  Write-Host '=== Build Admin (changed files only -> static bundle) ===' -ForegroundColor Cyan
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
    'REACT_APP_VERSION=1.0.7'
    'REACT_APP_SITE_NAME=SERVICE LINK'
    'REACT_APP_FOOTER_BRAND=SERVICELINK'
    'GENERATE_SOURCEMAP=false'
  ) | Set-Content '.env.production' -Encoding utf8
  if (-not (Test-Path 'node_modules')) { Invoke-Npm @('ci', '--legacy-peer-deps') 'Admin npm ci failed' }
  if (-not (Test-Path 'ckeditor5\node_modules')) {
    Push-Location ckeditor5
    Invoke-Npm @('install') 'ckeditor5 npm install failed'
    Invoke-Npm @('run', 'build') 'ckeditor5 npm build failed'
    Pop-Location
  }
  Invoke-Npm @('run', 'build') 'Admin npm build failed'
  Pop-Location

  $indexHtml = Join-Path $adminDir 'build\index.html'
  if (-not (Test-Path $indexHtml)) {
    throw "Admin build output missing: $indexHtml"
  }

  $tar = Join-Path $env:TEMP 'admin-artifact.tar.gz'
  if (Get-Command tar -ErrorAction SilentlyContinue) {
    tar czf $tar -C $adminDir build
    if ($LASTEXITCODE -ne 0) { throw "tar failed creating $tar (exit $LASTEXITCODE)" }
  } else {
    throw 'tar not found'
  }
  if ((Get-Item $tar).Length -lt 1000) {
    throw "Artifact tar too small or empty: $tar"
  }
  return $tar
}

function Deploy-Artifact {
  param([string]$Service, [string]$TarPath)
  $tarName = Split-Path -Leaf $TarPath
  Write-Host "=== Upload & apply $Service (~30 sec on server) ===" -ForegroundColor Green
  Invoke-Scp -LocalPath $TarPath -RemoteDest "ubuntu@${Ec2Host}:/tmp/$tarName"
  if ($Service -eq 'admin') {
    $remote = "set -e; sudo mkdir -p /tmp/deploy-artifacts/admin; sudo rm -rf /tmp/deploy-artifacts/admin/build; sudo tar xzf /tmp/$tarName -C /tmp/deploy-artifacts/admin; sudo bash /opt/app/deploy/ec2-apply-artifacts.sh admin"
  } else {
    $remote = "set -e; sudo mkdir -p /tmp/deploy-artifacts; sudo rm -rf /tmp/deploy-artifacts/$Service; sudo tar xzf /tmp/$tarName -C /tmp/deploy-artifacts; sudo bash /opt/app/deploy/ec2-apply-artifacts.sh $Service"
  }
  Invoke-Ssh -RemoteCommand $remote
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
    'api' {
      $tarPath = Build-Api
      Deploy-Artifact -Service api -TarPath $tarPath
    }
    'admin' {
      $tarPath = Build-Admin
      Deploy-Artifact -Service admin -TarPath $tarPath
    }
  }
}

Write-Host 'Done. Only changed service(s) were built and copied - no full server rebuild.' -ForegroundColor Green
