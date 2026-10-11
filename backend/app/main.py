from contextlib import asynccontextmanager
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone

from app.api import auth, services
from app.worker import run_monitoring_cycle

@asynccontextmanager
async def lifespan(app: FastAPI):
    # The worker is now decoupled and runs as an independent process
    yield

# Pass the lifespan context manager to the app
app = FastAPI(title="Sentinel API", lifespan=lifespan)

import os

cors_origins_env = os.getenv("ALLOWED_ORIGINS")
allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()] if cors_origins_env else [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://localhost:4173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app" if not cors_origins_env else None,
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
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}