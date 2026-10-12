from pydantic import BaseModel, HttpUrl, Field, field_validator
from datetime import datetime
from typing import Optional, List
from app.core.url_validator import validate_safe_url

class ServiceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    url: HttpUrl
    check_interval_seconds: int = Field(60, ge=10, le=86400)
    timeout_seconds: int = Field(10, ge=1, le=60)
    failure_threshold: int = Field(2, ge=1, le=10)
    expected_status_codes: Optional[List[int]] = None
    method: str = Field("GET", max_length=10)
    headers: Optional[dict] = None
    body: Optional[str] = None
    is_public: Optional[bool] = True

    @field_validator("method")
    @classmethod
    def validate_http_method(cls, v: str) -> str:
        m = v.upper().strip()
        if m not in ("GET", "HEAD", "POST"):
            raise ValueError("Only non-destructive methods (GET, HEAD, POST) are permitted for uptime checks.")
        return m

    @field_validator("url")
    @classmethod
    def validate_monitor_url(cls, v: HttpUrl) -> HttpUrl:
        validate_safe_url(str(v), allow_http=True)
        return v

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
    method: str
    headers: Optional[dict] = None
    body: Optional[str] = None
    is_public: Optional[bool] = True

    @field_validator("is_public", mode="before")
    @classmethod
    def default_legacy_is_public(cls, v):
        return True if v is None else v

    class Config:
        from_attributes = True

class ServiceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    url: Optional[HttpUrl] = None
    check_interval_seconds: Optional[int] = Field(None, ge=10, le=86400)
    timeout_seconds: Optional[int] = Field(None, ge=1, le=60)
    failure_threshold: Optional[int] = Field(None, ge=1, le=10)
    expected_status_codes: Optional[List[int]] = None
    method: Optional[str] = Field(None, max_length=10)
    headers: Optional[dict] = None
    body: Optional[str] = None

    @field_validator("method")
    @classmethod
    def validate_update_http_method(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            m = v.upper().strip()
            if m not in ("GET", "HEAD", "POST"):
                raise ValueError("Only non-destructive methods (GET, HEAD, POST) are permitted for uptime checks.")
            return m
        return v

    @field_validator("url")
    @classmethod
    def validate_update_monitor_url(cls, v: Optional[HttpUrl]) -> Optional[HttpUrl]:
        if v is not None:
            validate_safe_url(str(v), allow_http=True)
        return v

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
    active_incident: Optional[IncidentResponse] = None

    class Config:
        from_attributes = True

class DashboardSummaryResponse(BaseModel):
    stats: DashboardStats
    services: List[ServiceSummary]

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