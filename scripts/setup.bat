@echo off
chcp 65001 >nul
title Liga Abiturientov - Setup
color 0A
cls

echo ==========================================
echo    LIGA ABITURIENTOV - Setup
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

REM Create .env files
echo [*] Setting up environment files...

if not exist "Test_server\.env" (
    echo     Creating Test_server\.env...
    copy "Test_server\.env.example" "Test_server\.env" >nul
    echo [!] IMPORTANT: Edit Test_server\.env and set your PostgreSQL password!
    notepad "Test_server\.env"
) else (
    echo     Test_server\.env already exists
)

if not exist "Test_Bot\.env" (
    echo     Creating Test_Bot\.env...
    copy "Test_Bot\.env.example" "Test_Bot\.env" >nul
) else (
    echo     Test_Bot\.env already exists
)

echo.

REM Install Node.js dependencies
echo [*] Installing Node.js dependencies...

if not exist "frontend\node_modules" (
    echo     Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    if %errorlevel% neq 0 (
        echo [ERROR] Frontend install failed!
        pause
        exit /b 1
    )
) else (
    echo     Frontend dependencies already installed
)

if not exist "Test_server\node_modules" (
    echo     Installing backend dependencies...
    cd Test_server
    call npm install
    cd ..
    if %errorlevel% neq 0 (
        echo [ERROR] Backend install failed!
        pause
        exit /b 1
    )
) else (
    echo     Backend dependencies already installed
)

echo.

REM Install Python dependencies
echo [*] Installing Python dependencies...
echo     (This may take a while...)

cd Test_Bot
pip install -r requirements.txt >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Some Python packages failed to install.
    echo         This is normal if Build Tools need restart.
    echo.
    echo [!] If you JUST installed Build Tools, RESTART your computer first!
    echo     Then run setup.bat again.
    echo.
    echo     To install Build Tools:
    echo     winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
    timeout /t 5 >nul
)
cd ..

echo.

REM Create databases
echo [*] Creating databases...

if exist "database_setup.py" (
    echo     Creating main database...
    python database_setup.py --auto >nul 2>&1
    if %errorlevel% neq 0 (
        echo [WARNING] Main database setup failed.
        echo         Check your PostgreSQL password in Test_server\.env
    ) else (
        echo     Main database created successfully
    )
)

if exist "Test_Bot\database_setup.py" (
    echo     Creating bot database...
    cd Test_Bot
    python database_setup.py --auto >nul 2>&1
    cd ..
    if %errorlevel% neq 0 (
        echo [WARNING] Bot database setup failed.
    ) else (
        echo     Bot database created successfully
    )
)

echo.
echo ==========================================
echo    Setup Complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Edit Test_server\.env if database setup failed
echo 2. Run start.bat to launch all services
echo.
pause
