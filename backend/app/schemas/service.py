from pydantic import BaseModel, HttpUrl
from datetime import datetime
from typing import Optional, List

class ServiceCreate(BaseModel):
    name: str
    url: HttpUrl  # Validates that the input is a proper URL
    check_interval_seconds: int = 60

class ServiceResponse(BaseModel):
    id: int
    owner_id: int
    name: str
    url: str
    check_interval_seconds: int
    is_active: bool

    class Config:
        from_attributes = True

class CheckResponse(BaseModel):
    id: int
    checked_at: datetime
    status: str
    status_code: Optional[int] = None
    latency_ms: Optional[int] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True

class ServiceStatusResponse(BaseModel):
    uptime_percentage: float
    recent_checks: List[CheckResponse]