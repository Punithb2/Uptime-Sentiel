from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncAttrs
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

# Create the async engine
engine = create_async_engine(settings.DATABASE_URL, echo=False)

# Session factory for route dependencies
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

# Base class for all database models
class Base(AsyncAttrs, DeclarativeBase):
    pass
    
# Dependency function to get the database session in routes
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session