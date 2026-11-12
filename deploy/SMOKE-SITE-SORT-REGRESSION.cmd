@echo off
REM Regression after sites.dropdown_sort_order — New Reports / Messages / Faults / Sites
cd /d "%~dp0.."
node "%~dp0scripts\smoke-site-sort-regression.js" %*
exit /b %ERRORLEVEL%
