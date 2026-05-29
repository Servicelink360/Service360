@echo off
cd /d "%~dp0.."
echo === AWS must be configured first ===
echo Run in CMD: aws configure
echo   Region: ap-southeast-2
echo   Access Key + Secret from IAM
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "deploy\scripts\deploy-api-ec2.ps1"
pause
