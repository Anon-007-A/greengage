#!/bin/bash
# Quick start script for LMA Edge Platform Backend

echo "🚀 Starting LMA Edge Platform Backend..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env and add your OPENAI_API_KEY"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Create directories
mkdir -p uploads
mkdir -p chroma_db

# Run the server
echo "✅ Starting FastAPI server on http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
uvicorn app.main:app --reload --port 8000

