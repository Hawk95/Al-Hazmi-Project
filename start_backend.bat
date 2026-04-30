@echo off
cd /d "e:\al hazmi meat project\backend"
"C:\Users\MIAN UMAIR\AppData\Local\Programs\Python\Python312\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8003
pause
