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
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    webhook_url: Optional[str] = None