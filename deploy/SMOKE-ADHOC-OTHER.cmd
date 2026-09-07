@echo off
title Smoke: Adhoc + Other reports (local)
cd /d "%~dp0.."
node "%~dp0scripts\smoke-adhoc-other-reports.js" %*
exit /b %ERRORLEVEL%
