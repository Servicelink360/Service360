@echo off
setlocal
cd /d "%~dp0"

set "API=%~dp0service_link_api-main"
set "ADMIN=%~dp0service_link_admin-main"

if not exist "%API%\package.json" (
  echo Missing API project at "%API%"
  exit /b 1
)
if not exist "%ADMIN%\package.json" (
  echo Missing admin project at "%ADMIN%"
  exit /b 1
)

REM Ensure Redis Windows service is running (ignore error if already running or no permission)
net start Redis >nul 2>&1

echo Starting ServiceLink API...
start "ServiceLink API" /D "%API%" cmd /k npm run start:dev

timeout /t 2 /nobreak >nul

echo Starting ServiceLink Admin...
start "ServiceLink Admin" /D "%ADMIN%" cmd /k npm start

echo.
echo Open admin: http://localhost:3001
echo API (.env PORT): default http://localhost:5301
echo Close each window to stop that process.
endlocal
