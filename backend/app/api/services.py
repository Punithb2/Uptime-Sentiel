from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List

from app.core.database import get_db
from app.models.models import Service, User, Check, Incident
from app.schemas.service import ServiceCreate, ServiceResponse
from app.api.auth import get_current_user

router = APIRouter(prefix="/services", tags=["Services"])

@router.post("/", response_model=ServiceResponse)
async def create_service(
    service_in: ServiceCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_service = Service(
        owner_id=current_user.id,
        name=service_in.name,
        url=str(service_in.url),
        check_interval_seconds=service_in.check_interval_seconds
    )
    db.add(new_service)
    await db.commit()
    await db.refresh(new_service)
    return new_service

@router.get("/", response_model=List[ServiceResponse])
async def get_services(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only fetch services belonging to the logged-in user
    result = await db.execute(
        select(Service).where(Service.owner_id == current_user.id)
    )
    return list(result.scalars().all())

@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify the service exists AND belongs to the user
    result = await db.execute(
        select(Service).where(
            Service.id == service_id, 
            Service.owner_id == current_user.id
        )
    )
    service = result.scalars().first()
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found or unauthorized")
        
    await db.delete(service)
    await db.commit()
    return None

@router.get("/{service_id}/checks", response_model=dict)
async def get_service_checks(
    service_id: int,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify the user actually owns this service
    service_result = await db.execute(
        select(Service).where(
            Service.id == service_id, 
            Service.owner_id == current_user.id
        )
    )
    if not service_result.scalars().first():
        raise HTTPException(status_code=404, detail="Service not found or unauthorized")

    # 2. Fetch the most recent checks for this service
    checks_result = await db.execute(
        select(Check)
        .where(Check.service_id == service_id)
        .order_by(desc(Check.checked_at))
        .limit(limit)
    )
    raw_checks = checks_result.scalars().all()

    # 3. Calculate a basic uptime percentage based on the fetched checks
    uptime_percentage = 100.0
    if raw_checks:
        up_count = sum(1 for c in raw_checks if c.status == "UP")
        uptime_percentage = round((up_count / len(raw_checks)) * 100, 2)
    
    # 4. Serialize manually to prevent Pydantic errors
    serialized_checks = [
        {
            "id": check.id,
            "checked_at": check.checked_at,
            "status": check.status,
            "status_code": check.status_code,
            "latency_ms": check.latency_ms,
            "error_message": check.error_message
        }
        for check in raw_checks
    ]

    # 5. Fetch recent incidents
    incidents_result = await db.execute(
        select(Incident)
        .where(Incident.service_id == service_id)
        .order_by(desc(Incident.started_at))
        .limit(5)
    )
    raw_incidents = incidents_result.scalars().all()

    serialized_incidents = [
        {
            "id": inc.id,
            "started_at": inc.started_at,
            "resolved_at": inc.resolved_at,
            "is_open": inc.is_open,
            "cause": inc.cause
        }
        for inc in raw_incidents
    ]

    return {
        "uptime_percentage": uptime_percentage,
        "recent_checks": serialized_checks,
        "incidents": serialized_incidents
    }