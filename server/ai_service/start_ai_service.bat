@echo off
echo Starting Local AI Service for Resume Analyzer...
echo.

REM Check if virtual environment exists
if not exist "venv" (
    echo ERROR: Virtual environment not found!
    echo Please run setup.bat first to install dependencies.
    pause
    exit /b 1
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Check if requirements are installed
python -c "import transformers, flask" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Required packages not installed!
    echo Please run setup.bat first to install dependencies.
    pause
    exit /b 1
)

echo Starting AI service on http://localhost:5000
echo.
echo The service is loading AI models... This may take a few minutes on first run.
echo Once loaded, the service will be ready for resume analysis.
echo.
echo Press Ctrl+C to stop the service.
echo.

REM Start the AI service
python ai_server.py

