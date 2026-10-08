import os
import smtplib
from email.message import EmailMessage
import asyncio
from dotenv import load_dotenv

# Load variables from the .env file into the environment
load_dotenv()

def send_email_sync(to_email: str, subject: str, body: str):
    sender_email = os.getenv("SMTP_EMAIL")
    sender_password = os.getenv("SMTP_PASSWORD")
    
    if not sender_email or not sender_password:
        print("Skipping email alert: SMTP credentials not found in .env")
        return

    msg = EmailMessage()
    msg.set_content(body)
    msg["Subject"] = subject
    msg["From"] = sender_email
    msg["To"] = to_email

    try:
        # Connect to Gmail's secure SMTP server
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, sender_password)
            server.send_message(msg)
        print(f"📧 Alert email successfully sent to {to_email}")
    except Exception as e:
        print(f"❌ Failed to send email: {e}")

async def send_alert_email(to_email: str, subject: str, body: str):
    # Offload the synchronous SMTP network call to a background thread
    # so it doesn't block FastAPI or the worker's asynchronous ping loop
    await asyncio.to_thread(send_email_sync, to_email, subject, body)