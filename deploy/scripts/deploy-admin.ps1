param(
  [string]$ApiUrl = $env:API_URL,
  [string]$Bucket = $env:ADMIN_S3_BUCKET,
  [string]$Region = $(if ($env:AWS_REGION) { $env:AWS_REGION } else { "ap-southeast-2" })
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$adminDir = Join-Path $repoRoot "service_link_admin-main"
$outputs = Join-Path $repoRoot "deploy\aws-outputs.json"

if (-not $ApiUrl -and (Test-Path $outputs)) {
  $ApiUrl = (Get-Content $outputs | ConvertFrom-Json).api_url
}
if (-not $Bucket -and (Test-Path $outputs)) {
  $Bucket = (Get-Content $outputs | ConvertFrom-Json).admin_bucket
}
if (-not $ApiUrl) { throw "Set API_URL or run setup-aws-test.ps1 first." }
if (-not $Bucket) { throw "Set ADMIN_S3_BUCKET or run setup-aws-test.ps1 first." }

$envFile = Join-Path $adminDir ".env.prod"
@"
REACT_APP_MODE=PROD
REACT_APP_VERSION=1.0.7
REACT_APP_SITE_NAME=SERVICE LINK
REACT_APP_FOOTER_BRAND=SERVICELINK
REACT_APP_ORDER_API_URL=$ApiUrl
GENERATE_SOURCEMAP=false
"@ | Set-Content $envFile -Encoding utf8

Push-Location $adminDir
$env:NODE_OPTIONS = "--openssl-legacy-provider"
npm run build
Pop-Location

aws s3 sync (Join-Path $adminDir "build") "s3://$Bucket/" --delete --region $Region
Write-Host "Admin deployed: http://$Bucket.s3-website-$Region.amazonaws.com"
