@echo off
title Service Link - Start Applications
color 0A

echo ========================================
echo   Service Link - Starting Applications
echo ========================================
echo.

set BACKEND_PATH=C:\360\service_link_api-main
set FRONTEND_PATH=C:\360\service_link_admin-main

REM Check if directories exist
echo Listing contents of C:\360 ...
dir /ad /b C:\360
echo.
if not exist "%BACKEND_PATH%" (
    echo Error: Backend directory not found at %BACKEND_PATH%
    pause
    exit /b 1
)

if not exist "%FRONTEND_PATH%" (
    echo Error: Frontend directory not found at %FRONTEND_PATH%
    pause
    exit /b 1
)

echo Starting Backend API (port 5301)...
start "Backend API - Port 5301" cmd /k "cd /d %BACKEND_PATH% && echo Backend API - Starting... && npm run start:dev"

timeout /t 2 /nobreak >nul

echo Starting Frontend Admin (port 3001)...
start "Frontend Admin - Port 3001" cmd /k "cd /d %FRONTEND_PATH% && echo Frontend Admin - Starting... && npm start"

timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   Applications Starting...
echo ========================================
echo.
echo Backend API:    http://localhost:5301
echo Frontend Admin: http://localhost:3001
echo.
echo Login Credentials:
echo   Username: admin
echo   Password: admin123
echo.
echo Two command windows will open for each application.
echo Please wait for both applications to fully start...
echo.
echo This window will close in 5 seconds...
timeout /t 5 /nobreak >nul
