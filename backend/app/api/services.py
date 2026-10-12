from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, case
from typing import List
from datetime import datetime, timezone, timedelta
from collections import defaultdict

from app.core.database import get_db
from app.models.models import Service, User, Check, Incident
from app.schemas.service import (
    ServiceCreate, ServiceResponse, ServiceStatusResponse, 
    DashboardSummaryResponse, ServiceUpdate, GlobalIncidentResponse
)
from app.core.security import get_current_user

router = APIRouter(prefix="/services", tags=["Services"])

MAX_MONITORS_PER_USER = 15

@router.post("/", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    service_data: ServiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Abuse prevention: Cap monitors per user on free tier
    count_query = await db.execute(
        select(func.count(Service.id)).where(Service.owner_id == current_user.id)
    )
    current_count = count_query.scalar() or 0
    if current_count >= MAX_MONITORS_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Monitor quota reached. Accounts are limited to {MAX_MONITORS_PER_USER} monitors."
        )

    new_service = Service(
        owner_id=current_user.id,
        name=service_data.name,
        url=str(service_data.url),
        check_interval_seconds=service_data.check_interval_seconds,
        timeout_seconds=service_data.timeout_seconds,
        failure_threshold=service_data.failure_threshold,
        expected_status_codes=service_data.expected_status_codes,
        method=service_data.method.upper(),
        headers=service_data.headers,
        body=service_data.body
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
    # Multi-tenant isolation: Only fetch services owned by the current user
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
    # Multi-tenant isolation: 404 if service does not exist or belongs to another user
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
    # Multi-tenant check
    service_result = await db.execute(
        select(Service).where(
            Service.id == service_id, 
            Service.owner_id == current_user.id
        )
    )
    if not service_result.scalars().first():
        raise HTTPException(status_code=404, detail="Service not found or unauthorized")

    safe_limit = min(max(1, limit), 100)
    checks_result = await db.execute(
        select(Check)
        .where(Check.service_id == service_id)
        .order_by(desc(Check.checked_at))
        .limit(safe_limit)
    )
    raw_checks = checks_result.scalars().all()

    uptime_percentage = 100.0
    if raw_checks:
        up_count = sum(1 for c in raw_checks if c.status == "UP")
        uptime_percentage = round((up_count / len(raw_checks)) * 100, 2)
    
    serialized_checks = [
        {
            "id": check.id,
            "checked_at": check.checked_at,
            "status": check.status,
            "status_code": check.status_code,
            "latency_ms": check.latency_ms,
            "error_message": check.error_message,
            "ssl_valid": check.ssl_valid,
            "ssl_expires_at": check.ssl_expires_at
        }
        for check in raw_checks
    ]

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

@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches dashboard summary, fully optimized to eliminate N+1 queries."""
    services_query = await db.execute(select(Service).where(Service.owner_id == current_user.id))
    services = services_query.scalars().all()
    
    if not services:
        return {
            "stats": {
                "total_monitors": 0,
                "up_monitors": 0,
                "down_monitors": 0,
                "pending_monitors": 0,
                "paused_monitors": 0,
                "average_latency_ms": 0
            },
            "services": []
        }
        
    service_ids = [s.id for s in services]
    twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    
    # 1. Batch fetch accurate 24h uptime stats using SQL conditional aggregation
    stats_query = await db.execute(
        select(
            Check.service_id,
            func.count(Check.id).label("total"),
            func.sum(case((Check.status == "UP", 1), else_=0)).label("up_count")
        )
        .where(Check.service_id.in_(service_ids), Check.checked_at >= twenty_four_hours_ago)
        .group_by(Check.service_id)
    )
    uptime_stats = {row.service_id: {"total": row.total, "up": row.up_count} for row in stats_query.all()}
    
    # 2. Batch fetch active incidents
    incidents_query = await db.execute(
        select(Incident).where(Incident.service_id.in_(service_ids), Incident.is_open == True)
    )
    active_incidents = {inc.service_id: inc for inc in incidents_query.scalars().all()}
    
    # 3. Batch fetch recent sparkline checks in a SINGLE query (eliminates N+1 loop)
    # Using window function row_number() over (partition by service_id order by checked_at desc)
    rn_col = func.row_number().over(
        partition_by=Check.service_id,
        order_by=desc(Check.checked_at)
    ).label("row_num")

    ranked_subq = (
        select(Check.id, Check.service_id, rn_col)
        .where(Check.service_id.in_(service_ids))
        .subquery()
    )

    batch_checks_query = await db.execute(
        select(Check)
        .join(ranked_subq, Check.id == ranked_subq.c.id)
        .where(ranked_subq.c.row_num <= 30)
        .order_by(Check.service_id, desc(Check.checked_at))
    )
    
    recent_checks_by_service = defaultdict(list)
    for check_obj in batch_checks_query.scalars().all():
        recent_checks_by_service[check_obj.service_id].append(check_obj)

    service_summaries = []
    up_count = down_count = paused_count = pending_count = total_latency = latency_services = 0
        
    for service in services:
        stats = uptime_stats.get(service.id, {"total": 0, "up": 0})
        if stats["total"] > 0:
            uptime_pct = round((stats["up"] / stats["total"]) * 100, 2)
        else:
            uptime_pct = 100.0 if service.status != "DOWN" else 0.0

        if service.status == "UP": up_count += 1
        elif service.status == "DOWN": down_count += 1
        elif service.status == "PAUSED": paused_count += 1
        elif service.status == "PENDING": pending_count += 1

        if service.last_latency_ms is not None:
            total_latency += service.last_latency_ms
            latency_services += 1

        service_summaries.append({
            "service": service,
            "uptime_percentage": uptime_pct,
            "recent_checks": recent_checks_by_service[service.id],
            "active_incident": active_incidents.get(service.id)
        })

    global_stats = {
        "total_monitors": len(services),
        "up_monitors": up_count,
        "down_monitors": down_count,
        "paused_monitors": paused_count,
        "pending_monitors": pending_count,
        "average_latency_ms": round(total_latency / latency_services) if latency_services > 0 else 0
    }

    return {"stats": global_stats, "services": service_summaries}

@router.get("/dashboard/incidents", response_model=List[GlobalIncidentResponse])
async def get_all_incidents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches a chronological timeline of incidents across all the user's services."""
    query = (
        select(Incident, Service)
        .join(Service, Incident.service_id == Service.id)
        .where(Service.owner_id == current_user.id)
        .order_by(desc(Incident.started_at))
        .limit(100)
    )
    
    result = await db.execute(query)
    
    formatted_incidents = []
    for incident, service in result.all():
        formatted_incidents.append({
            "id": incident.id,
            "service_id": service.id,
            "service_name": service.name,
            "service_url": service.url,
            "is_open": incident.is_open,
            "cause": incident.cause,
            "started_at": incident.started_at,
            "resolved_at": incident.resolved_at
        })
        
    return formatted_incidents

@router.post("/{service_id}/check-now", response_model=ServiceResponse)
async def trigger_immediate_check(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = await db.get(Service, service_id)
    if not service or service.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Service not found")
    
    service.next_check_at = datetime.now(timezone.utc)
    service.is_active = True
    await db.commit()
    await db.refresh(service)
    return service

@router.post("/{service_id}/pause", response_model=ServiceResponse)
async def pause_service(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = await db.get(Service, service_id)
    if not service or service.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Service not found")
    
    service.is_active = False
    service.status = "PAUSED"
    await db.commit()
    await db.refresh(service)
    return service

@router.post("/{service_id}/resume", response_model=ServiceResponse)
async def resume_service(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = await db.get(Service, service_id)
    if not service or service.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Service not found")
    
    service.is_active = True
    service.status = "PENDING"
    service.next_check_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(service)
    return service

@router.get("/{service_id}/history")
async def get_service_history(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches a single service, its recent incidents, and up to 100 history points for charting."""
    service = await db.get(Service, service_id)
    if not service or service.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Service not found")
    
    checks_result = await db.execute(
        select(Check).where(Check.service_id == service_id).order_by(desc(Check.checked_at)).limit(100)
    )
    checks = checks_result.scalars().all()
    
    incidents_result = await db.execute(
        select(Incident).where(Incident.service_id == service_id).order_by(desc(Incident.started_at)).limit(10)
    )
    incidents = incidents_result.scalars().all()
    
    return {
        "service": service,
        "checks": checks,
        "incidents": incidents
    }

@router.patch("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: int,
    update_data: ServiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Allows users to edit an existing monitor's settings."""
    service = await db.get(Service, service_id)
    if not service or service.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Service not found")
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if key == "url":
            setattr(service, key, str(value))
        else:
            setattr(service, key, value)
        
    await db.commit()
    await db.refresh(service)
    return service

@router.patch("/{service_id}/visibility")
async def toggle_service_visibility(
    service_id: int, 
    is_public: bool = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggles whether a monitor is displayed on the public status page."""
    query = await db.execute(select(Service).where(Service.id == service_id, Service.owner_id == current_user.id))
    service = query.scalars().first()
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
        
    service.is_public = is_public
    await db.commit()
    
    return {"message": "Visibility updated", "is_public": service.is_public}

@router.get("/status/public/{slug}")
async def get_public_status_page(slug: str, db: AsyncSession = Depends(get_db)):
    """
    Unauthenticated public status page.
    Sanitizes incidents to ensure internal causes / debug responses are never leaked publicly.
    """
    user_query = await db.execute(select(User).where(User.public_slug == slug))
    user = user_query.scalars().first()

    if not user or not user.is_public_page_enabled:
        raise HTTPException(status_code=404, detail="Public status page not found or is disabled.")

    services_query = await db.execute(
        select(Service).where(
            Service.owner_id == user.id, 
            Service.is_active == True,
            Service.is_public == True
        )
    )
    services = services_query.scalars().all()
    
    if not services:
        return {"services": [], "incidents": []}
        
    service_ids = [s.id for s in services]
    twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    
    stats_query = await db.execute(
        select(
            Check.service_id,
            func.count(Check.id).label("total"),
            func.sum(case((Check.status == "UP", 1), else_=0)).label("up_count")
        )
        .where(Check.service_id.in_(service_ids), Check.checked_at >= twenty_four_hours_ago)
        .group_by(Check.service_id)
    )
    uptime_stats = {row.service_id: {"total": row.total, "up": row.up_count} for row in stats_query.all()}
    
    incidents_query = await db.execute(
        select(Incident)
        .where(Incident.service_id.in_(service_ids))
        .order_by(desc(Incident.started_at))
        .limit(20)
    )
    all_incidents = incidents_query.scalars().all()
    
    service_data = []
    for service in services:
        stats = uptime_stats.get(service.id, {"total": 0, "up": 0})
        uptime_pct = round((stats["up"] / stats["total"]) * 100, 2) if stats["total"] > 0 else 100.0
        
        service_data.append({
            "id": service.id,
            "name": service.name,
            "status": service.status,
            "uptime_24h": uptime_pct,
            "last_checked_at": service.last_checked_at
        })

    # Sanitize incidents: Do NOT expose internal debug error strings
    sanitized_incidents = [
        {
            "id": inc.id,
            "is_open": inc.is_open,
            "started_at": inc.started_at,
            "resolved_at": inc.resolved_at,
            "status": "Service Outage" if inc.is_open else "Resolved Outage"
        }
        for inc in all_incidents
    ]
        
    return {
        "services": service_data,
        "incidents": sanitized_incidents
    }