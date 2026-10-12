#!/bin/bash
set -e

# 1. Run database migrations before boot
echo "🚀 Running database migrations..."
alembic upgrade head

# 2. Start the background worker as an independent, isolated OS process
echo "⚡ Starting background worker in separate OS process..."
python -m app.worker &
WORKER_PID=$!

# Trap termination signals to ensure background worker shuts down cleanly
cleanup() {
    echo "🛑 Received termination signal. Stopping background worker (PID: $WORKER_PID)..."
    kill -TERM "$WORKER_PID" 2>/dev/null || true
    wait "$WORKER_PID" 2>/dev/null || true
    echo "✅ Worker stopped cleanly."
}
trap cleanup SIGTERM SIGINT EXIT

# 3. Start the FastAPI web server in the foreground
echo "🌐 Starting FastAPI web server..."
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} &
UVICORN_PID=$!

# Wait for uvicorn process
wait "$UVICORN_PID"
