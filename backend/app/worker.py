import asyncio
import os
import ssl
import socket
import json
import tempfile
from urllib.parse import urlparse
import httpx
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import engine
from app.models.models import Service, Check, Incident, User
from app.core.mailer import send_alert_email
from app.core.url_validator import validate_safe_url_async
from app.core.logger import logger

MAX_CONCURRENT_CHECKS = 50
semaphore = asyncio.Semaphore(MAX_CONCURRENT_CHECKS)
_active_tasks = set()

HEARTBEAT_PATH = os.path.join(tempfile.gettempdir(), "sentinel_worker_heartbeat.json")

def write_heartbeat_sync():
    """Writes a timestamped heartbeat to a local temporary file for /health monitoring."""
    try:
        data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "pid": os.getpid()
        }
        with open(HEARTBEAT_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f)
    except Exception as e:
        logger.error(f"Failed to record worker heartbeat: {e}")

async def record_heartbeat():
    await asyncio.to_thread(write_heartbeat_sync)

async def cleanup_old_checks():
    """Deletes ping history older than 30 days to prevent infinite database growth."""
    try:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)
        async with AsyncSession(engine, expire_on_commit=False) as db:
            result = await db.execute(delete(Check).where(Check.checked_at < cutoff_date))
            await db.commit()
            if result.rowcount > 0:
                logger.info(f"Database Cleanup: Removed {result.rowcount} old checks.")
    except Exception as e:
        logger.error(f"Cleanup error: {e}")

async def send_webhook_alert(url: str, message: str):
    """Fires a generic JSON payload that works natively with Slack and Discord."""
    if not url: return
    try:
        # Defense-in-depth: Verify webhook is safe HTTPS and not targeting internal infrastructure
        await validate_safe_url_async(url, allow_http=False)
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json={"content": message}, timeout=5.0)
            response.raise_for_status()
    except Exception as e:
        logger.error(f"Webhook delivery failed to {url}: {e}")

async def inspect_ssl_cert(url_str: str) -> tuple[bool | None, datetime | None]:
    """Inspects SSL certificate expiry on HTTPS services without blocking the event loop."""
    parsed = urlparse(url_str)
    if parsed.scheme.lower() != "https" or not parsed.hostname:
        return None, None

    port = parsed.port or 443
    hostname = parsed.hostname

    def _sync_ssl():
        try:
            ctx = ssl.create_default_context()
            with socket.create_connection((hostname, port), timeout=4.0) as sock:
                with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    not_after_str = cert.get("notAfter")
                    if not_after_str:
                        # e.g. "May 20 12:00:00 2026 GMT"
                        expires_at = datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
                        is_valid = expires_at > datetime.now(timezone.utc)
                        return is_valid, expires_at
            return True, None
        except Exception:
            return False, None

    try:
        return await asyncio.to_thread(_sync_ssl)
    except Exception:
        return None, None

async def ping_service(client: httpx.AsyncClient, service_id: int):
    """Runs an individual check with commit-first notifications and sanitized logging."""
    try:
        async with semaphore:
            start_time = datetime.now(timezone.utc)
            is_up = False
            status_code = None
            error_message = None
            ssl_valid = None
            ssl_expires_at = None
            
            # Notifications queued to dispatch strictly AFTER DB commit
            dispatches = []

            async with AsyncSession(engine, expire_on_commit=False) as db:
                service = await db.get(Service, service_id)
                if not service:
                    return

                try:
                    # Non-blocking async DNS and SSRF validation
                    await validate_safe_url_async(service.url, allow_http=True)
                    
                    method = service.method or "GET"
                    headers = service.headers or {}
                    
                    request_kwargs = {
                        "method": method,
                        "url": service.url,
                        "timeout": float(service.timeout_seconds),
                        "headers": headers
                    }
                    
                    if service.body and method.upper() == "POST":
                        request_kwargs["content"] = service.body.encode('utf-8')

                    response = await client.request(**request_kwargs)
                    status_code = response.status_code
                    
                    if service.expected_status_codes:
                        is_up = status_code in service.expected_status_codes
                    else:
                        is_up = 200 <= status_code < 400
                    
                    # Sanitize error message: Store HTTP status and standard reason only.
                    # NEVER store response.text to prevent data leaks / internal info exposure.
                    if not is_up:
                        reason = getattr(response, "reason_phrase", "") or "Unsuccessful status"
                        error_message = f"HTTP {status_code} ({reason})"
                        
                except Exception as e:
                    is_up = False
                    error_message = e.__class__.__name__

                # Check SSL expiry for HTTPS services
                if service.url.startswith("https://"):
                    ssl_valid, ssl_expires_at = await inspect_ssl_cert(service.url)
                    
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
                    error_message=error_message,
                    ssl_valid=ssl_valid,
                    ssl_expires_at=ssl_expires_at
                )
                db.add(new_check)

                service.last_checked_at = start_time
                service.last_latency_ms = latency
                service.last_status_code = status_code
                service.next_check_at = end_time + timedelta(seconds=service.check_interval_seconds)

                # Cooldown check: 15 minutes between alert notifications
                now = datetime.now(timezone.utc)
                can_alert = (
                    service.last_alert_at is None or 
                    (now - service.last_alert_at).total_seconds() > 900
                )

                if not is_up:
                    service.failure_count += 1
                    service.status = "DOWN"
                    
                    if not open_incident and service.failure_count >= service.failure_threshold:
                        cause_text = error_message or f"HTTP {status_code}"
                        new_incident = Incident(
                            service_id=service_id,
                            started_at=now,
                            is_open=True,
                            cause=cause_text
                        )
                        db.add(new_incident)
                        logger.warning(f"[ALERT] Incident opened for {service.name} (cause: {cause_text})")
                        
                        owner = await db.get(User, service.owner_id)
                        
                        if owner and can_alert:
                            service.last_alert_at = now
                            dispatches.append({
                                "type": "DOWN",
                                "email": owner.email,
                                "webhook_url": owner.webhook_url,
                                "service_name": service.name,
                                "url": service.url,
                                "cause": cause_text,
                                "time": str(new_incident.started_at)
                            })
                        else:
                            logger.info(f"[COOLDOWN] Suppressed DOWN alert for {service.name} (Rate Limited)")

                else:
                    service.failure_count = 0
                    service.status = "UP"
                    
                    if open_incident:
                        open_incident.is_open = False
                        open_incident.resolved_at = now
                        logger.info(f"[RESOLVED] Incident closed for {service.name}")
                        
                        # FIX: On recovery, reset cooldown by setting last_alert_at = None!
                        # Setting to None ensures future incidents immediately notify without waiting 15 mins.
                        service.last_alert_at = None
                        
                        owner = await db.get(User, service.owner_id)
                        if owner:
                            dispatches.append({
                                "type": "UP",
                                "email": owner.email,
                                "webhook_url": owner.webhook_url,
                                "service_name": service.name,
                                "url": service.url
                            })

                status_text = "UP" if is_up else "DOWN"
                logger.info(f"Check: {service.name} | {status_text} | {latency}ms")
                
                # CRITICAL: Commit to DB first before firing external network calls!
                await db.commit()

            # DISPATCH NOTIFICATIONS AFTER COMMIT
            for action in dispatches:
                try:
                    if action["type"] == "DOWN":
                        alert_msg = f"🚨 Sentinel Alert: {action['service_name']} is DOWN. ({action['cause']})"
                        email_body = f"Your service '{action['service_name']}' ({action['url']}) is down.\n\nReason: {action['cause']}\nTime: {action['time']}"
                        await send_alert_email(action["email"], f"🚨 Sentinel Alert: {action['service_name']} is DOWN", email_body)
                        if action["webhook_url"]:
                            await send_webhook_alert(action["webhook_url"], alert_msg)
                        logger.info(f"[NOTIFICATION] Dispatched DOWN alert for {action['service_name']}")

                    elif action["type"] == "UP":
                        recovery_msg = f"✅ Sentinel Recovery: {action['service_name']} is back UP."
                        email_body = f"Your service '{action['service_name']}' ({action['url']}) has recovered and is healthy."
                        await send_alert_email(action["email"], f"✅ Sentinel Recovery: {action['service_name']} is UP", email_body)
                        if action["webhook_url"]:
                            await send_webhook_alert(action["webhook_url"], recovery_msg)
                        logger.info(f"[NOTIFICATION] Dispatched UP recovery alert for {action['service_name']}")
                except Exception as notify_err:
                    logger.error(f"Notification dispatch failure for {action.get('service_name')}: {notify_err}")

    except Exception as e:
        logger.error(f"❌ Monitor check failed for service {service_id}: {e}")
    finally:
        _active_tasks.discard(service_id)

async def run_monitoring_cycle():
    """Scheduler loop with atomic DB locking and vitality heartbeat."""
    cleanup_counter = 0
    async with httpx.AsyncClient() as client:
        while True:
            try:
                # 1. Update heartbeat timestamp every cycle
                await record_heartbeat()

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
                logger.error(f"Scheduler loop error: {e}")
                
            await asyncio.sleep(2)

if __name__ == "__main__":
    logger.info("🚀 Sentinel Background Worker Initialized")
    asyncio.run(run_monitoring_cycle())