@echo off
title Service360 - AWS login then deploy API
cd /d "%~dp0.."
echo.
echo ============================================================
echo  STEP 1 - You must log in to AWS (one time)
echo ============================================================
echo.
echo  A browser may open. Or create keys here:
echo  https://console.aws.amazon.com/iam/home#/users
echo  - Your user - Security credentials - Create access key - CLI
echo.
echo  Then enter below when prompted:
echo    Region: ap-southeast-2
echo    Output: json
echo.
pause
aws configure
if errorlevel 1 (
  echo AWS configure failed. Install CLI or run from CMD as Administrator.
  pause
  exit /b 1
)
echo.
aws sts get-caller-identity
if errorlevel 1 (
  echo Still not logged in. Fix aws configure first.
  pause
  exit /b 1
)
echo.
echo ============================================================
echo  STEP 2 - Deploy API on EC2 (Docker + Redis + RDS)
echo ============================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "deploy\scripts\deploy-api-ec2.ps1"
echo.
echo Done. Open deploy\aws-outputs.json for API URL.
echo Then set Amplify REACT_APP_ORDER_API_URL to that URL.
pause
