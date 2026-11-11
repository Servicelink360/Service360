@echo off
REM Monthly reports smoke (local API + local DB only)
cd /d "%~dp0.."
node "%~dp0scripts\smoke-monthly-reports.js" %*
exit /b %ERRORLEVEL%
