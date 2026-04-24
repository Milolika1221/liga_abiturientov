@echo off
chcp 65001 >nul
title Liga Abiturientov - Launcher
color 0B
cls

echo ==========================================
echo    LIGA ABITURIENTOV - Launch
echo ==========================================
echo.

REM Go to project root
cd ..

echo [*] Checking requirements...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo Download: https://nodejs.org/
    start https://nodejs.org/
    pause
    exit /b 1
)

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python not found!
    echo Download: https://www.python.org/
    start https://www.python.org/
    pause
    exit /b 1
)

echo [OK] All requirements found
echo.

REM Check .env files
if not exist "Test_server\.env" (
    echo [INFO] Creating Test_server\.env from template...
    copy "Test_server\.env.example" "Test_server\.env" >nul
    echo [!] IMPORTANT: Edit Test_server\.env and set your PostgreSQL password!
    notepad "Test_server\.env"
)

if not exist "Test_Bot\.env" (
    echo [INFO] Creating Test_Bot\.env from template...
    copy "Test_Bot\.env.example" "Test_Bot\.env" >nul
)

echo.
echo ==========================================
echo    Starting Services
echo ==========================================
echo.

REM Install dependencies if needed
if not exist "frontend\node_modules" (
    echo [1/3] Installing frontend dependencies...
    cd frontend
    call npm install --silent
    cd ..
)

if not exist "Test_server\node_modules" (
    echo [2/3] Installing backend dependencies...
    cd Test_server
    call npm install --silent
    cd ..
)

echo [3/3] Starting services...
echo.

REM Create PID tracking file
set PIDFILE=%TEMP%\liga_pids.txt
if exist %PIDFILE% del %PIDFILE%

REM Start Backend and capture PID
echo [+] Starting Backend Server...
start "Backend Server" cmd /c "cd Test_server && title Backend Server && node server.js"
timeout /t 2 /nobreak >nul
for /f "tokens=2" %%a in ('tasklist /fi "WINDOWTITLE eq Backend Server" /fo list ^| findstr "PID:"') do (
    echo BACKEND=%%a >> %PIDFILE%
)

REM Start Bot and capture PID
echo [+] Starting VK Bot...
start "VK Bot" cmd /c "cd Test_Bot && title VK Bot && python main.py"
timeout /t 2 /nobreak >nul
for /f "tokens=2" %%a in ('tasklist /fi "WINDOWTITLE eq VK Bot" /fo list ^| findstr "PID:"') do (
    echo BOT=%%a >> %PIDFILE%
)

REM Start Frontend and capture PID
echo [+] Starting Frontend (port 5173)...
cd frontend
start "Frontend" cmd /c "title Frontend && npm run dev"
timeout /t 2 /nobreak >nul
cd ..
for /f "tokens=2" %%a in ('tasklist /fi "WINDOWTITLE eq Frontend" /fo list ^| findstr "PID:"') do (
    echo FRONTEND=%%a >> %PIDFILE%
)

REM Start ngrok automatically if exists
set NGROK_FOUND=0
if exist "ngrok.exe" set NGROK_FOUND=1
if exist "%LOCALAPPDATA%\ngrok\ngrok.exe" set NGROK_FOUND=1
if exist "C:\Program Files\ngrok\ngrok.exe" set NGROK_FOUND=1

if %NGROK_FOUND%==1 (
    echo [+] Starting ngrok for public access...
    echo [!] NOTE: First time requires: ngrok config add-authtoken YOUR_TOKEN
    start "Ngrok" cmd /c "title Ngrok && ngrok http 5173"
    echo [i] Waiting for ngrok to initialize...
    timeout /t 3 /nobreak >nul
    for /f "tokens=2" %%a in ('tasklist /fi "WINDOWTITLE eq Ngrok" /fo list ^| findstr "PID:"') do (
        echo NGROK=%%a >> %PIDFILE%
    )
    timeout /t 2 /nobreak >nul
    
    REM Try to get public URL from ngrok API
    for /f "tokens=*" %%a in ('powershell -Command "try { $r=Invoke-RestMethod http://localhost:4040/api/tunnels -TimeoutSec 2; $r.tunnels[0].public_url } catch { }"') do set NGROK_URL=%%a
    if not "%NGROK_URL%"=="" (
        echo [+] Public URL: %NGROK_URL%
    ) else (
        echo [i] Ngrok starting... Check Ngrok window for URL
    )
) else (
    echo [!] ngrok.exe not found - Local access only
    echo     Download: https://ngrok.com/download
)

echo.
echo ==========================================
echo    All services started!
echo ==========================================
echo.
echo Frontend:     http://localhost:5173
echo Backend:      http://localhost:3000
echo.
echo.
echo ==========================================
echo    ACTIVE SERVICES - Press any key to STOP
echo ==========================================
echo.
pause >nul

REM Kill all services by PID
echo [*] Stopping all services...

if exist %PIDFILE% (
    for /f "tokens=1,2 delims==" %%a in (%PIDFILE%) do (
        echo     Stopping %%a (PID: %%b)...
        taskkill /F /PID %%b >nul 2>nul
    )
    del %PIDFILE%
)

REM Backup: kill by process names
taskkill /F /IM "node.exe" >nul 2>nul
taskkill /F /IM "python.exe" >nul 2>nul
taskkill /F /IM "ngrok.exe" >nul 2>nul

echo.
echo Services stopped.
timeout /t 2 >nul
