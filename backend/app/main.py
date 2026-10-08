from fastapi import FastAPI
from app.api import auth, services

app = FastAPI(title="Sentinel API")

# Register the routes
app.include_router(auth.router)
app.include_router(services.router)

@app.get("/")
async def root():
    return {"status": "ok", "message": "Sentinel API is running"}