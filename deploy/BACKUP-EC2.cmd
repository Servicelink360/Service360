@echo off
REM Create RDS backup on EC2 and download to deploy\database\ (read-only)
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File deploy\scripts\backup-database-ec2.ps1 %*
exit /b %ERRORLEVEL%
