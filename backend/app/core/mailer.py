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
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10) as server:
            server.login(sender_email, sender_password)
            server.send_message(msg)
        logger.info(f"Alert email delivered to {to_email} via SMTP")
    except Exception as e:
        logger.error(f"Failed to send alert email via SMTP to {to_email}: {e}")

async def send_alert_email(to_email: str, subject: str, body: str):
    """
    Sends alert emails.
    1. Brevo HTTPS API (Port 443): Free, 300 emails/day to ANY recipient without owning a custom domain.
       Bypasses cloud provider SMTP blocks (Render free tier blocks ports 25, 465, 587).
    2. SMTP Fallback: For local development or servers with unblocked SMTP ports.
    """
    # 1. Brevo HTTPS API (Primary for cloud production)
    brevo_api_key = os.getenv("BREVO_API_KEY")
    if brevo_api_key:
        sender_email = os.getenv("BREVO_SENDER_EMAIL", os.getenv("SMTP_EMAIL"))
        if not sender_email:
            logger.warning("Brevo configured without BREVO_SENDER_EMAIL. Set your verified email.")
            return

        payload = {
            "sender": {"name": "UptimeSentinel", "email": sender_email.strip()},
            "to": [{"email": to_email}],
            "subject": subject,
            "textContent": body
        }
        headers = {
            "api-key": brevo_api_key.strip(),
            "Content-Type": "application/json"
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers)
                if response.status_code in (200, 201):
                    logger.info(f"Alert email successfully dispatched to {to_email} via Brevo HTTPS API")
                else:
                    logger.error(f"Brevo HTTPS email failed ({response.status_code}): {response.text}")
        except Exception as e:
            logger.error(f"Brevo HTTPS email error to {to_email}: {e}")
        return

    # 2. Fallback to local SMTP if configured
    if os.getenv("SMTP_EMAIL") and os.getenv("SMTP_PASSWORD"):
        await asyncio.to_thread(_send_email_smtp_sync, to_email, subject, body)
    else:
        logger.warning("Skipping email alert: Neither BREVO_API_KEY nor SMTP credentials configured.")