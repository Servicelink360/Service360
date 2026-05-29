@echo off
echo 🚀 Starting Service Link Applications...
echo.

echo 📡 Starting Backend API...
cd service_link_api-main
start "Backend API" cmd /k "npm run start:dev"
cd ..

echo.
echo 🖥️  Starting Frontend Admin...
cd service_link_admin-main
start "Frontend Admin" cmd /k "npm start"
cd ..

echo.
echo ✅ Both applications are starting...
echo.
echo 📍 Backend API will be available at: http://localhost:3000
echo 📍 Frontend Admin will be available at: http://localhost:5301
echo.
echo ⏳ Please wait for both applications to fully start up...
echo.
pause
