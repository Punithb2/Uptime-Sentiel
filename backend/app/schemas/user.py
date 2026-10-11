from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: int
    email: str
    role: Optional[str] = None
    created_at: Optional[datetime] = None
    webhook_url: Optional[str] = None
    public_slug: Optional[str] = None
    is_public_page_enabled: Optional[bool] = False
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    webhook_url: Optional[str] = None
    
    # Added for Account Profile updates
    email: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None
    is_public_page_enabled: Optional[bool] = None