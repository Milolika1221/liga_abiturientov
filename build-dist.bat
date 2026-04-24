@echo off
chcp 65001 >nul
title Build Distribution Package
color 0A
cls

echo ==========================================
echo    BUILD DISTRIBUTION PACKAGE
echo ==========================================
echo.

set VERSION=1.0.0
set DIST_DIR=dist\Liga-Abiturientov-v%VERSION%

echo [1/5] Cleaning old builds...
if exist "dist" rmdir /S /Q "dist"
mkdir "%DIST_DIR%"

echo [2/5] Building frontend...
cd frontend
call npm install --silent 2>nul
call npm run build 2>nul
cd ..

echo [3/5] Copying files to distribution...

REM Copy source files
xcopy "Test_server" "%DIST_DIR%\Test_server\" /E /I /Y /Q >nul
xcopy "Test_Bot" "%DIST_DIR%\Test_Bot\" /E /I /Y /Q >nul
xcopy "frontend\dist" "%DIST_DIR%\frontend\" /E /I /Y /Q >nul

REM Copy root files
copy "README.md" "%DIST_DIR%\" >nul
copy "DEPLOY.md" "%DIST_DIR%\" >nul
copy "start.bat" "%DIST_DIR%\" >nul
copy "database_setup.py" "%DIST_DIR%\" >nul
copy "setup.py" "%DIST_DIR%\" >nul

REM Copy .env examples
copy "Test_server\.env.example" "%DIST_DIR%\Test_server\" >nul
copy "Test_Bot\.env.example" "%DIST_DIR%\Test_Bot\" >nul

echo [4/5] Removing unnecessary files...

REM Remove node_modules (will be installed on first run)
if exist "%DIST_DIR%\Test_server\node_modules" rmdir /S /Q "%DIST_DIR%\Test_server\node_modules" >nul 2>nul
if exist "%DIST_DIR%\Test_Bot\__pycache__" rmdir /S /Q "%DIST_DIR%\Test_Bot\__pycache__" >nul 2>nul

REM Remove .env files with real credentials
if exist "%DIST_DIR%\Test_server\.env" del "%DIST_DIR%\Test_server\.env" >nul 2>nul
if exist "%DIST_DIR%\Test_Bot\.env" del "%DIST_DIR%\Test_Bot\.env" >nul 2>nul

echo [5/5] Creating README for end user...
(
echo # Лига Абитуриентов v%VERSION%
echo.
echo ## Быстрый старт
echo.
echo 1. Установите PostgreSQL: https://www.postgresql.org/download/
echo 2. Установите Node.js: https://nodejs.org/
echo 3. Установите Python: https://www.python.org/
echo 4. Запустите файл `start.bat`
echo.
echo ## Первый запуск
echo.
echo При первом запуске:
echo - Скрипт создаст файлы .env из шаблонов
echo - Откроется окно для редактирования - укажите пароль PostgreSQL
echo - Все зависимости установятся автоматически
echo.
echo ## URL после запуска
echo.
echo - Сайт: http://localhost:4173
echo - API: http://localhost:3000
echo.
echo ## Данные для входа
echo.
echo Админ: admin / admin123
echo Пользователь: student1 / password1
echo.
) > "%DIST_DIR%\README_FIRST.txt"

echo.
echo ==========================================
echo    BUILD COMPLETE!
echo ==========================================
echo.
echo Distribution folder: %DIST_DIR%
echo.
echo Next steps:
echo 1. Test the build locally: cd %DIST_DIR% ^&^& start.bat
echo 2. Zip the folder: Liga-Abiturientov-v%VERSION%.zip
echo 3. Share the zip file
echo.
pause
