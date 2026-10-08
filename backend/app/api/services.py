from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.models.models import Service, User
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