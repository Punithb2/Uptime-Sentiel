import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone

from app.api import auth, services

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Decoupled microservice architecture:
    # The monitoring worker runs as an independent OS process (e.g. via start.sh or separate worker instance).
    yield

# Pass the lifespan context manager to the app
app = FastAPI(title="Sentinel API", lifespan=lifespan)

cors_origins_env = os.getenv("ALLOWED_ORIGINS")
allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()] if cors_origins_env else [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://localhost:4173",
]

allow_creds = True
if "*" in allowed_origins:
    allow_creds = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=os.getenv("ALLOWED_ORIGINS_REGEX", r"https://.*\.vercel\.app"),
    allow_credentials=allow_creds,
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