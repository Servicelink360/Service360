@echo off
setlocal
cd /d "%~dp0.."
node "%~dp0scripts\smoke-safety-audit-incident.js" %*
exit /b %ERRORLEVEL%
