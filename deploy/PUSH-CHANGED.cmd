@echo off
REM Build only what changed, copy to EC2 (~30 sec). Example: deploy\PUSH-CHANGED.cmd
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\deploy-changed.ps1" %*
exit /b %ERRORLEVEL%
