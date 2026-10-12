from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
import jwt
import urllib.parse
import uuid

from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_password_hash, verify_password, create_access_token, get_current_user, ALGORITHM
from app.models.models import User, Service, Check, Incident
from app.schemas.user import UserCreate, Token, UserResponse, UserUpdate

router = APIRouter(prefix="/auth", tags=["Authentication"])

# This tells FastAPI where the login endpoint is for the Swagger UI
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.post("/register", response_model=Token)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    new_user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password)
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Generate and return JWT immediately
    access_token = create_access_token(data={"sub": str(new_user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    # Find user by email (OAuth2 form uses 'username' field for email)
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
    # Generate JWT
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

# Dependency to get the logged-in user for protected routes
async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalars().first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

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
    # 1. Update Webhook (SSRF protection already validated via Pydantic UserUpdate schema)
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
        if not update_data.current_password or not verify_password(update_data.current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Invalid current password.")
        current_user.hashed_password = get_password_hash(update_data.new_password)

    # 4. Update Public Page Toggle & Auto-generate Slug
    if update_data.is_public_page_enabled is not None:
        current_user.is_public_page_enabled = update_data.is_public_page_enabled
        # Generate a random slug if they are enabling it for the first time and don't have one
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
    # 1. Find all services owned by the user
    services_query = await db.execute(select(Service.id).where(Service.owner_id == current_user.id))
    service_ids = services_query.scalars().all()
    
    # 2. If they have services, cleanly delete all child records first
    if service_ids:
        await db.execute(delete(Check).where(Check.service_id.in_(service_ids)))
        await db.execute(delete(Incident).where(Incident.service_id.in_(service_ids)))
        await db.execute(delete(Service).where(Service.id.in_(service_ids)))
    
    # 3. Delete the user
    await db.delete(current_user)
    await db.commit()
    
    return {"message": "Account permanently deleted"}