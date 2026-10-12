import os
import smtplib
from email.message import EmailMessage
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

from app.core.logger import logger

def _send_email_smtp_sync(to_email: str, subject: str, body: str):
    """Fallback SMTP delivery with explicit timeout (for local development)."""
    sender_email = os.getenv("SMTP_EMAIL")
    sender_password = os.getenv("SMTP_PASSWORD")
    
    if not sender_email or not sender_password:
        logger.warning("Skipping email alert: No SMTP credentials configured.")
        return

    msg = EmailMessage()
    msg.set_content(body)
    msg["Subject"] = subject
    msg["From"] = sender_email
    msg["To"] = to_email

    try:
        # Timeout at 10 seconds to avoid hanging on blocked ports
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10) as server:
            server.login(sender_email, sender_password)
            server.send_message(msg)
        logger.info(f"Alert email delivered to {to_email} via SMTP")
    except Exception as e:
        logger.error(f"Failed to send alert email via SMTP to {to_email}: {e}")

async def send_alert_email(to_email: str, subject: str, body: str):
    """
    Sends alert emails.
    Prioritizes HTTPS API (Resend) on port 443 to bypass cloud provider SMTP blocks (e.g. Render free tier).
    Falls back to SMTP if RESEND_API_KEY is not configured.
    """
    resend_api_key = os.getenv("RESEND_API_KEY")
    
    if resend_api_key:
        resend_from = os.getenv("RESEND_FROM_EMAIL", "UptimeSentinel <onboarding@resend.dev>")
        payload = {
            "from": resend_from,
            "to": [to_email],
            "subject": subject,
            "text": body
        }
        headers = {
            "Authorization": f"Bearer {resend_api_key.strip()}",
            "Content-Type": "application/json"
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post("https://api.resend.com/emails", json=payload, headers=headers)
                if response.status_code in (200, 201):
                    logger.info(f"Alert email successfully dispatched to {to_email} via Resend HTTPS API")
                else:
                    logger.error(f"Resend HTTPS email failed ({response.status_code}): {response.text}")
        except Exception as e:
            logger.error(f"HTTPS email delivery error to {to_email}: {e}")
        return

    # Fallback to local SMTP if configured
    if os.getenv("SMTP_EMAIL") and os.getenv("SMTP_PASSWORD"):
        await asyncio.to_thread(_send_email_smtp_sync, to_email, subject, body)
    else:
        logger.warning("Skipping email alert: Neither RESEND_API_KEY nor SMTP credentials configured.")