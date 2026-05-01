@echo off
title Al Hazmi ERP - Startup

echo [1/3] Starting PostgreSQL...
"C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\18\data" -s -w
echo      PostgreSQL ready.

echo [2/3] Starting Backend (port 8003)...
start "ERP Backend" cmd /k "cd /d "e:\al hazmi meat project\backend" && "C:\Users\MIAN UMAIR\AppData\Local\Programs\Python\Python312\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8003"

echo [3/3] Starting Frontend...
start "ERP Frontend" cmd /k "cd /d "e:\al hazmi meat project\frontend" && npm run dev"

echo.
echo All services starting. Opening browser in 8 seconds...
timeout /t 8 /nobreak >nul
start http://localhost:5173

exit
