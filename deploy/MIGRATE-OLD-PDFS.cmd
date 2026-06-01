@echo off
REM Move legacy report PDFs from old EC2 (3.104.215.45) to S3 via NEW EC2 (13.55.122.55).
REM Requires: SSH key at %USERPROFILE%\Downloads\service360-api_Key_pem.pem

setlocal
set KEY=%USERPROFILE%\Downloads\service360-api_Key_pem.pem
set HOST=ubuntu@13.55.122.55
set REPO=/opt/app

if not exist "%KEY%" (
  echo SSH key not found: %KEY%
  exit /b 1
)

echo Step 1: Sync PDFs from old server to new EC2...
ssh -i "%KEY%" -o StrictHostKeyChecking=no %HOST% "bash %REPO%/deploy/sync-old-pdfs-from-server.sh"
if errorlevel 1 exit /b 1

echo Step 2: Upload to S3 and update DB pdf_file URLs...
ssh -i "%KEY%" -o StrictHostKeyChecking=no %HOST% "bash %REPO%/deploy/migrate-old-pdfs-to-s3.sh --apply"
exit /b %ERRORLEVEL%
