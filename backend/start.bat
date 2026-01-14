@echo off
REM Quick start script for LMA Edge Platform Backend (Windows)

echo Starting LMA Edge Platform Backend...

REM Check if .env exists
if not exist .env (
    echo .env file not found. Creating from .env.example...
    copy .env.example .env
    echo Please edit .env and add your OPENAI_API_KEY
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Create directories
if not exist uploads mkdir uploads
if not exist chroma_db mkdir chroma_db

REM Run the server
echo Starting FastAPI server on http://localhost:8000
echo API Docs: http://localhost:8000/docs
uvicorn app.main:app --reload --port 8000

pause

