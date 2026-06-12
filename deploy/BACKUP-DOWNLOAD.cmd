@echo off
REM Read-only RDS backup to deploy\database\ (does not change AWS database)
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File deploy\scripts\backup-database.ps1
pause
