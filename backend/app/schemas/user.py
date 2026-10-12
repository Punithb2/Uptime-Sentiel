from pydantic import BaseModel, Field, field_validator, ConfigDict
from datetime import datetime
from typing import Optional
import re
from app.core.url_validator import validate_safe_url

EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"

class UserCreate(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=6, max_length=72)

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if not re.match(EMAIL_REGEX, clean):
            raise ValueError("Invalid email address format.")
        return clean

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: Optional[str] = None
    created_at: Optional[datetime] = None
    webhook_url: Optional[str] = None
    public_slug: Optional[str] = None
    is_public_page_enabled: Optional[bool] = False

class UserUpdate(BaseModel):
    webhook_url: Optional[str] = None
    email: Optional[str] = Field(None, max_length=255)
    current_password: Optional[str] = Field(None, max_length=72)
    new_password: Optional[str] = Field(None, min_length=6, max_length=72)
    is_public_page_enabled: Optional[bool] = None

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        clean = v.strip().lower()
        if not re.match(EMAIL_REGEX, clean):
            raise ValueError("Invalid email address format.")
        return clean

    @field_validator("webhook_url")
    @classmethod
    def validate_webhook(cls, v: Optional[str]) -> Optional[str]:
        if not v or not v.strip():
            return None
        # Webhooks must use secure HTTPS and avoid internal IPs/cloud metadata
        return validate_safe_url(v.strip(), allow_http=False)