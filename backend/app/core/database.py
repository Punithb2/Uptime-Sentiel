from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncAttrs
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

# Create the async engine with serverless connection pooling
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=5,         # Base connection pool size tailored for serverless PostgreSQL
    max_overflow=10,     # Allow burst connections during peak monitoring spikes
    pool_timeout=30,     # Seconds to wait before timing out on connection checkout
    pool_pre_ping=True,  # Detects stale/closed connections and reconnects automatically
    pool_recycle=300,    # Replaces connections every 5 mins to prevent stale cloud socket drops
)

# Session factory for route dependencies
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

# Base class for all database models
class Base(AsyncAttrs, DeclarativeBase):
    pass
    
# Dependency function to get the database session in routes
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session