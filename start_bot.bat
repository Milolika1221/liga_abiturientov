@echo off
echo Starting VK Bot outside Docker...
echo.
echo This will start the VK bot separately from Docker containers
echo Make sure Docker containers (postgres, server, frontend) are running
echo.
cd Test_Bot
python main.py
pause
