import asyncio
import sys
import selectors
from logging.config import fileConfig
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlalchemy import pool
from alembic import context

# 1. Import our models and config
from app.core.config import settings
from app.core.database import Base
from app.models.models import User, Service, Check, Incident, AlertChannel

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 2. Tell Alembic to look at our Base for table structures
target_metadata = Base.metadata

def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations():
    configuration = config.get_section(config.config_ini_section)
    # 3. Inject our DATABASE_URL from .env
    configuration["sqlalchemy.url"] = settings.DATABASE_URL
    
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

def run_migrations_online():
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(
            asyncio.WindowsSelectorEventLoopPolicy()
        )
    asyncio.run(run_async_migrations())

if context.is_offline_mode():
    # Offline mode not used for async
    pass
else:
    run_migrations_online()