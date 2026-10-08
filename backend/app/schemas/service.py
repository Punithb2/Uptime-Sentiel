from pydantic import BaseModel, HttpUrl

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