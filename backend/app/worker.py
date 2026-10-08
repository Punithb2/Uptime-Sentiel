import asyncio
import httpx
from datetime import datetime, timezone
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import engine
from app.models.models import Service, Check, Incident, User
from app.core.mailer import send_alert_email

async def ping_service(client: httpx.AsyncClient, service: Service, db: AsyncSession):
    start_time = datetime.now(timezone.utc)
    is_up = False
    status_code = None
    error_message = None
    
    try:
        response = await client.get(service.url, timeout=10.0)
        status_code = response.status_code
        is_up = 200 <= status_code < 400
    except Exception as e:
        is_up = False
        error_message = str(e)
        
    end_time = datetime.now(timezone.utc)
    latency = int((end_time - start_time).total_seconds() * 1000)

    # 1. Fetch the previous check BEFORE we save the new one
    last_check_query = await db.execute(
        select(Check)
        .where(Check.service_id == service.id)
        .order_by(desc(Check.checked_at))
        .limit(1)
    )
    last_check = last_check_query.scalars().first()

    # 2. Check for any currently open incident
    incident_query = await db.execute(
        select(Incident).where(Incident.service_id == service.id, Incident.is_open == True)
    )
    open_incident = incident_query.scalars().first()

    # 3. Save the new check
    new_check = Check(
        service_id=service.id,
        status="UP" if is_up else "DOWN",
        status_code=status_code,
        latency_ms=latency,
        error_message=error_message
    )
    db.add(new_check)
    
    # 4. State Tracking: Open or Resolve Incidents
    if not is_up:
        if not open_incident and last_check and last_check.status == "DOWN":
            new_incident = Incident(
                service_id=service.id,
                started_at=datetime.now(timezone.utc),
                is_open=True,
                cause=error_message or f"HTTP {status_code}"
            )
            db.add(new_incident)
            print(f"⚠️ [ALERT] Incident opened for {service.name}: {new_incident.cause}")
            
            # Fetch the service owner and send a DOWN alert
            owner = await db.get(User, service.owner_id)
            if owner:
                subject = f"🚨 Sentinel Alert: {service.name} is DOWN"
                body = f"Your service '{service.name}' ({service.url}) is currently unreachable.\n\nError: {new_incident.cause}\nTime: {new_incident.started_at}\n\nPlease check your Sentinel dashboard."
                await send_alert_email(owner.email, subject, body)
    else:
        if open_incident:
            open_incident.is_open = False
            open_incident.resolved_at = datetime.now(timezone.utc)
            print(f"✅ [RESOLVED] Incident closed for {service.name}. Service is back online.")
            
            # Fetch the service owner and send a RECOVERY alert
            owner = await db.get(User, service.owner_id)
            if owner:
                subject = f"✅ Sentinel Recovery: {service.name} is UP"
                body = f"Your service '{service.name}' ({service.url}) has recovered and is now responding normally."
                await send_alert_email(owner.email, subject, body)
    
    status_text = "UP" if is_up else "DOWN"
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {service.name} | {status_text} | {latency}ms")

async def run_monitoring_cycle():
    while True:
        try:
            async with AsyncSession(engine) as db:
                # Fetch all services from the database
                result = await db.execute(select(Service))
                services = result.scalars().all()
                
                # Execute all HTTP pings concurrently using a shared connection pool
                if services:
                    async with httpx.AsyncClient() as client:
                        tasks = [ping_service(client, service, db) for service in services]
                        await asyncio.gather(*tasks)
                    
                    # Commit all new check records to Neon in a single transaction
                    await db.commit()
                
        except Exception as e:
            print(f"Monitoring worker error: {e}")
            
        # Pause for 60 seconds before the next global cycle
        await asyncio.sleep(60)