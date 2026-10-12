#!/bin/bash
set -e

# 1. Run database migrations before boot
echo "🚀 Running database migrations..."
alembic upgrade head

# 2. Start the background worker as an independent, isolated OS process
echo "⚡ Starting background worker in separate OS process..."
python -m app.worker &

# 3. Start the FastAPI web server in the foreground
echo "🌐 Starting FastAPI web server..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
