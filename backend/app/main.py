import os
import json
import tempfile
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone

from app.api import auth, services

HEARTBEAT_PATH = os.path.join(tempfile.gettempdir(), "sentinel_worker_heartbeat.json")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Decoupled microservice architecture:
    # Monitoring worker runs as an independent OS process managed via start.sh
    yield

app = FastAPI(title="Sentinel API", lifespan=lifespan)

cors_origins_env = os.getenv("ALLOWED_ORIGINS")
env_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()] if cors_origins_env else []

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://localhost:4173",
    "https://uptime-sentinel-six.vercel.app",
] + env_origins

# Scoped regex matching your specific Vercel app and preview deployments
origin_regex = os.getenv("ALLOWED_ORIGINS_REGEX", r"https://uptime-sentinel.*\.vercel\.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(services.router)

@app.get("/")
async def root():
    return {"status": "ok", "message": "Sentinel API is running"}

@app.get("/health")
async def health_check():
    """
    Production health check monitoring both FastAPI and worker vitality.
    Reports degraded status if the worker background process stops sending heartbeats.
    """
    now = datetime.now(timezone.utc)
    worker_status = "offline"
    worker_last_seen = None

    if os.path.exists(HEARTBEAT_PATH):
        try:
            with open(HEARTBEAT_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                worker_last_seen = data.get("timestamp")
                if worker_last_seen:
                    ts = datetime.fromisoformat(worker_last_seen)
                    if (now - ts).total_seconds() <= 90:
                        worker_status = "active"
                    else:
                        worker_status = "stale"
        except Exception:
            worker_status = "error"

    payload = {
        "status": "healthy" if worker_status == "active" else "degraded",
        "worker": worker_status,
        "worker_last_heartbeat": worker_last_seen,
        "timestamp": now.isoformat()
    }

    if os.getenv("STRICT_HEALTH_CHECK", "false").lower() == "true" and worker_status != "active":
        return JSONResponse(status_code=503, content=payload)

    return payload