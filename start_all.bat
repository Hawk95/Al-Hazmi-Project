@echo off
title Al Hazmi ERP - Startup

echo [0/4] Killing any processes on ports 8003 and 5173...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":8003"') do (
    echo   Killing PID %%p on port 8003
    taskkill /F /PID %%p >nul 2>&1
)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":5173"') do (
    echo   Killing PID %%p on port 5173
    taskkill /F /PID %%p >nul 2>&1
)
timeout /t 2 /nobreak >nul
echo      Ports cleared.

echo [1/4] Starting PostgreSQL...
"C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\18\data" -s -w
echo      PostgreSQL ready.

echo [2/4] Starting Backend on port 8003...
start "ERP Backend" cmd /k "cd /d "e:\al hazmi meat project\backend" && "C:\Users\MIAN UMAIR\AppData\Local\Programs\Python\Python312\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8003"
timeout /t 3 /nobreak >nul

echo [3/4] Starting Frontend on port 5173...
start "ERP Frontend" cmd /k "cd /d "e:\al hazmi meat project\frontend" && npm run dev -- --port 5173"

echo [4/4] Opening browser in 7 seconds...
timeout /t 7 /nobreak >nul
start http://localhost:5173

echo.
echo =============================================
echo   Frontend : http://localhost:5173
echo   Backend  : http://127.0.0.1:8003
echo   Login    : admin@alhazmi.com / Admin@123
echo =============================================
exit
