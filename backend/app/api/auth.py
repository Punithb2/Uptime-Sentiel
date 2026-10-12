import time
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.database import get_db
from app.core.security import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    get_current_user, # Imported from core.security - single source of truth
    oauth2_scheme
)
from app.models.models import User, Service, Check, Incident
from app.schemas.user import UserCreate, Token, UserResponse, UserUpdate

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory sliding window rate limiter to prevent brute-force attacks on auth
_rate_limits = defaultdict(list)

def enforce_auth_rate_limit(request: Request, max_requests: int = 10, window_seconds: int = 60):
    """Restricts authentication attempts per IP within a sliding time window."""
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    # Filter out entries outside the window
    valid_timestamps = [t for t in _rate_limits[client_ip] if now - t < window_seconds]
    if len(valid_timestamps) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many authentication attempts. Please slow down and try again shortly."
        )
    valid_timestamps.append(now)
    _rate_limits[client_ip] = valid_timestamps

@router.post("/register", response_model=Token)
async def register(
    user_data: UserCreate, 
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    enforce_auth_rate_limit(request, max_requests=5, window_seconds=60)
    
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_pwd = await get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_pwd
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Generate and return JWT immediately
    access_token = create_access_token(data={"sub": str(new_user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: AsyncSession = Depends(get_db)
):
    enforce_auth_rate_limit(request, max_requests=10, window_seconds=60)
    
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
    is_valid = await verify_password(form_data.password, user.hashed_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Returns the logged-in user's profile and settings."""
    return current_user

@router.patch("/me", response_model=UserResponse)
async def update_user_profile(
    update_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Updates the user's settings, including webhooks, email, and password."""
    # 1. Update Webhook
    if update_data.webhook_url is not None:
        current_user.webhook_url = update_data.webhook_url.strip() if update_data.webhook_url else None
        
    # 2. Update Email
    if update_data.email:
        if update_data.email != current_user.email:
            existing = await db.execute(select(User).where(User.email == update_data.email))
            if existing.scalars().first():
                raise HTTPException(status_code=400, detail="Email already in use.")
        current_user.email = update_data.email

    # 3. Update Password
    if update_data.new_password:
        if not update_data.current_password:
            raise HTTPException(status_code=400, detail="Invalid current password.")
        pwd_matches = await verify_password(update_data.current_password, current_user.hashed_password)
        if not pwd_matches:
            raise HTTPException(status_code=400, detail="Invalid current password.")
        current_user.hashed_password = await get_password_hash(update_data.new_password)

    # 4. Update Public Page Toggle & Auto-generate Slug
    if update_data.is_public_page_enabled is not None:
        current_user.is_public_page_enabled = update_data.is_public_page_enabled
        if current_user.is_public_page_enabled and not current_user.public_slug:
            import uuid
            current_user.public_slug = uuid.uuid4().hex[:12]
        
    await db.commit()
    await db.refresh(current_user)
    return current_user

@router.delete("/me")
async def delete_user_account(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Permanently deletes the user and all their associated data."""
    services_query = await db.execute(select(Service.id).where(Service.owner_id == current_user.id))
    service_ids = services_query.scalars().all()
    
    if service_ids:
        await db.execute(delete(Check).where(Check.service_id.in_(service_ids)))
        await db.execute(delete(Incident).where(Incident.service_id.in_(service_ids)))
        await db.execute(delete(Service).where(Service.id.in_(service_ids)))
    
    await db.delete(current_user)
    await db.commit()
    
    return {"message": "Account permanently deleted"}