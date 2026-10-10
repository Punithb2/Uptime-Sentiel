import asyncio
import httpx
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import engine
from app.models.models import Service, Check, Incident, User
from app.core.mailer import send_alert_email

MAX_CONCURRENT_CHECKS = 50
semaphore = asyncio.Semaphore(MAX_CONCURRENT_CHECKS)
_active_tasks = set()

async def cleanup_old_checks():
    """Deletes ping history older than 30 days to prevent infinite database growth."""
    try:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)
        async with AsyncSession(engine, expire_on_commit=False) as db:
            result = await db.execute(delete(Check).where(Check.checked_at < cutoff_date))
            await db.commit()
            if result.rowcount > 0:
                print(f"🧹 Database Cleanup: Removed {result.rowcount} old checks.")
    except Exception as e:
        print(f"Cleanup error: {e}")

async def send_webhook_alert(url: str, message: str):
    """Fires a generic JSON payload that works natively with Slack and Discord."""
    if not url: return
    try:
        async with httpx.AsyncClient() as client:
            await client.post(url, json={"content": message}, timeout=5.0)
    except Exception as e:
        print(f"Webhook delivery failed: {e}")

async def ping_service(client: httpx.AsyncClient, service_id: int):
    """Runs an individual check with dynamic configurations and guaranteed cleanup."""
    try:
        async with semaphore:
            start_time = datetime.now(timezone.utc)
            is_up = False
            status_code = None
            error_message = None
            
            # Prevent SQLAlchemy from expiring the service object after commit
            async with AsyncSession(engine, expire_on_commit=False) as db:
                service = await db.get(Service, service_id)
                if not service:
                    return

                try:
                    # 1. Apply Dynamic Timeout
                    response = await client.get(service.url, timeout=float(service.timeout_seconds))
                    status_code = response.status_code
                    
                    # 2. Apply Custom Expected Status Codes (if configured)
                    if service.expected_status_codes:
                        is_up = status_code in service.expected_status_codes
                    else:
                        is_up = 200 <= status_code < 400
                        
                except Exception as e:
                    is_up = False
                    error_message = str(e)
                    
                end_time = datetime.now(timezone.utc)
                latency = int((end_time - start_time).total_seconds() * 1000)

                incident_query = await db.execute(
                    select(Incident).where(Incident.service_id == service_id, Incident.is_open == True)
                )
                open_incident = incident_query.scalars().first()

                new_check = Check(
                    service_id=service_id,
                    status="UP" if is_up else "DOWN",
                    status_code=status_code,
                    latency_ms=latency,
                    error_message=error_message
                )
                db.add(new_check)

                service.last_checked_at = start_time
                service.last_latency_ms = latency
                service.last_status_code = status_code
                service.next_check_at = end_time + timedelta(seconds=service.check_interval_seconds)

                if not is_up:
                    service.failure_count += 1
                    service.status = "DOWN"
                    
                    # 3. Apply Dynamic Failure Threshold
                    if not open_incident and service.failure_count >= service.failure_threshold:
                        new_incident = Incident(
                            service_id=service_id,
                            started_at=datetime.now(timezone.utc),
                            is_open=True,
                            cause=error_message or f"HTTP {status_code}"
                        )
                        db.add(new_incident)
                        print(f"⚠️ [ALERT] Incident opened for {service.name}")
                        
                        owner = await db.get(User, service.owner_id)
                        if owner:
                            alert_msg = f"🚨 Sentinel Alert: {service.name} is DOWN. ({new_incident.cause})"
                            
                            # Send Email
                            await send_alert_email(
                                owner.email, 
                                f"🚨 Sentinel Alert: {service.name} is DOWN", 
                                f"Your service '{service.name}' ({service.url}) is down.\n\nError: {new_incident.cause}\nTime: {new_incident.started_at}"
                            )
                            
                            # Send Webhook
                            if owner.webhook_url:
                                await send_webhook_alert(owner.webhook_url, alert_msg)
                else:
                    service.failure_count = 0
                    service.status = "UP"
                    
                    if open_incident:
                        open_incident.is_open = False
                        open_incident.resolved_at = datetime.now(timezone.utc)
                        print(f"✅ [RESOLVED] Incident closed for {service.name}")
                        
                        owner = await db.get(User, service.owner_id)
                        if owner:
                            recovery_msg = f"✅ Sentinel Recovery: {service.name} is back UP."
                            
                            # Send Email
                            await send_alert_email(
                                owner.email, 
                                f"✅ Sentinel Recovery: {service.name} is UP", 
                                f"Your service '{service.name}' ({service.url}) has recovered."
                            )
                            
                            # Send Webhook
                            if owner.webhook_url:
                                await send_webhook_alert(owner.webhook_url, recovery_msg)
                
                # Log the output before the transaction commits
                status_text = "UP" if is_up else "DOWN"
                print(f"[{datetime.now().strftime('%H:%M:%S')}] {service.name} | {status_text} | {latency}ms")
                
                await db.commit()

    except Exception as e:
        print(f"❌ Monitor check failed for service {service_id}: {e}")
    finally:
        _active_tasks.discard(service_id)


async def run_monitoring_cycle():
    """Scheduler loop utilizing atomic DB locking for multi-instance safety."""
    cleanup_counter = 0
    async with httpx.AsyncClient() as client:
        while True:
            try:
                now = datetime.now(timezone.utc)
                due_service_ids = []
                
                async with AsyncSession(engine, expire_on_commit=False) as db:
                    query = (
                        select(Service.id)
                        .where(
                            Service.is_active.is_(True),
                            Service.next_check_at <= now
                        )
                        .with_for_update(skip_locked=True)
                    )
                    result = await db.execute(query)
                    due_service_ids = result.scalars().all()
                    
                    if due_service_ids:
                        await db.execute(
                            update(Service)
                            .where(Service.id.in_(due_service_ids))
                            # Enforce a 65-second lease lock to avoid race conditions with slow timeouts
                            .values(next_check_at=now + timedelta(seconds=65))
                        )
                        await db.commit()
                
                for service_id in due_service_ids:
                    if service_id not in _active_tasks:
                        _active_tasks.add(service_id)
                        asyncio.create_task(ping_service(client, service_id))
                        
                # Run DB cleanup every ~1 hour (1800 ticks * 2 seconds)
                cleanup_counter += 1
                if cleanup_counter >= 1800:
                    await cleanup_old_checks()
                    cleanup_counter = 0
                    
            except Exception as e:
                print(f"Scheduler error: {e}")
                
            await asyncio.sleep(2)

if __name__ == "__main__":
    print("🚀 Sentinel Background Worker Started")
    asyncio.run(run_monitoring_cycle())