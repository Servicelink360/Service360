@echo off
REM Messages Cc smoke (API + local admin up-check)
REM Optional: set SMOKE_USER / SMOKE_PASS / SMOKE_TYPE
cd /d "%~dp0.."
node "%~dp0scripts\smoke-messages-cc.js" %*
exit /b %ERRORLEVEL%
