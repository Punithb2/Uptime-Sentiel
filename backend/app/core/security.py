from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.models import User

ALGORITHM = "HS256"

# Tells FastAPI where the frontend sends login requests (for Swagger UI and dependency injection)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

import asyncio

def _hash_sync(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed_bytes.decode('utf-8')

def _verify_sync(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode('utf-8'), 
        hashed_password.encode('utf-8')
    )

async def get_password_hash(password: str) -> str:
    """Non-blocking async password hashing via worker thread."""
    return await asyncio.to_thread(_hash_sync, password)

async def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Non-blocking async password verification via worker thread."""
    return await asyncio.to_thread(_verify_sync, plain_password, hashed_password)

# Synchronous aliases for backwards compatibility
get_password_hash_sync = _hash_sync
verify_password_sync = _verify_sync

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta if expires_delta else timedelta(days=7))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: AsyncSession = Depends(get_db)
) -> User:
    """Decodes the JWT token and fetches the logged-in user from the database."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode using the SECRET_KEY from your settings
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.InvalidTokenError:
        raise credentials_exception
    except Exception:
        raise credentials_exception
        
    # Fetch user from database using the ID inside the token
    user = await db.get(User, int(user_id))
    if user is None:
        raise credentials_exception
        
    return user