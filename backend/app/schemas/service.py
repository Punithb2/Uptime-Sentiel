from pydantic import BaseModel, HttpUrl, Field
from datetime import datetime
from typing import Optional, List

class ServiceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    url: HttpUrl
    check_interval_seconds: int = Field(60, ge=10, le=86400)
    timeout_seconds: int = Field(10, ge=1, le=60)
    failure_threshold: int = Field(2, ge=1, le=10)
    expected_status_codes: Optional[List[int]] = None

class ServiceResponse(BaseModel):
    id: int
    owner_id: int
    name: str
    url: str
    check_interval_seconds: int
    is_active: bool
    
    # Made optional with defaults to handle legacy database rows
    status: Optional[str] = "PENDING"
    failure_count: Optional[int] = 0
    
    last_checked_at: Optional[datetime] = None
    next_check_at: Optional[datetime] = None
    last_latency_ms: Optional[int] = None
    last_status_code: Optional[int] = None
    timeout_seconds: int
    failure_threshold: int
    expected_status_codes: Optional[List[int]] = None

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

class DashboardStats(BaseModel):
    total_monitors: int
    up_monitors: int
    down_monitors: int
    pending_monitors: int
    paused_monitors: int
    average_latency_ms: int

# NEW: Properly serializes the nested incident data
class IncidentResponse(BaseModel):
    id: int
    is_open: bool
    cause: str
    started_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ServiceSummary(BaseModel):
    service: ServiceResponse
    uptime_percentage: float
    recent_checks: List[CheckResponse] = []
    # FIX: Use the specific schema instead of dict
    active_incident: Optional[IncidentResponse] = None

    class Config:
        from_attributes = True

class DashboardSummaryResponse(BaseModel):
    stats: DashboardStats
    services: List[ServiceSummary]

class ServiceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    url: Optional[HttpUrl] = None
    check_interval_seconds: Optional[int] = Field(None, ge=10, le=86400)
    timeout_seconds: Optional[int] = Field(None, ge=1, le=60)
    failure_threshold: Optional[int] = Field(None, ge=1, le=10)
    expected_status_codes: Optional[List[int]] = None

class GlobalIncidentResponse(BaseModel):
    id: int
    service_id: int
    service_name: str
    service_url: str
    is_open: bool
    cause: str
    started_at: datetime
    resolved_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True