@echo off
title Resume Analyzer with Local AI
echo ========================================
echo    Resume Analyzer with Local AI
echo ========================================
echo.

echo Starting services...
echo.

REM Check if Python AI service is set up
if not exist "server\ai_service\venv" (
    echo Setting up Python AI service first...
    cd server\ai_service
    call setup.bat
    cd ..\..
    echo.
)

REM Start AI service in new window
echo Starting AI Service (Python)...
start "AI Service" cmd /k "cd server\ai_service && call start_ai_service.bat"

REM Wait a moment for AI service to start
echo Waiting for AI service to initialize...
timeout /t 5 /nobreak >nul

REM Start Node.js server
echo Starting Node.js Server...
cd server
start "Node.js Server" cmd /k "npm start"
cd ..

REM Start React client
echo Starting React Client...
cd client
start "React Client" cmd /k "npm run dev"
cd ..

echo.
echo ========================================
echo Services are starting up:
echo ========================================
echo.
echo 1. AI Service:     http://localhost:5000
echo 2. Node.js API:    http://localhost:3001  
echo 3. React Client:   http://localhost:5173
echo.
echo The AI service may take 2-5 minutes to load models on first run.
echo All windows will remain open for monitoring and easy stopping.
echo.
echo Press any key to continue...
pause >nul

