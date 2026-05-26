"""
Email service - sends meeting invites & report notifications.

Note: Google Calendar API already sends primary invites via sendUpdates=all.
This service is for ADDITIONAL emails (custom invites, report ready, reminders).
"""
import asyncio
from email.message import EmailMessage
from typing import List, Optional

import aiosmtplib

from app.core.config import settings


async def send_email(
    to_emails: List[str],
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
) -> bool:
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"[email] SMTP not configured. Would send to {to_emails}: {subject}")
        return False

    msg = EmailMessage()
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"] = ", ".join(to_emails)
    msg["Subject"] = subject

    if text_body:
        msg.set_content(text_body)
        msg.add_alternative(html_body, subtype="html")
    else:
        msg.set_content(html_body, subtype="html")

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        return True
    except Exception as e:
        print(f"[email] Send failed: {e}")
        return False


def render_meeting_invite_html(
    *,
    title: str,
    host_name: str,
    date_str: str,
    time_str: str,
    duration_minutes: int,
    meet_link: str,
    agenda: str,
    attendees: List[str],
) -> str:
    """HTML email invite (sent in addition to Google's native invite)"""
    attendees_html = "".join(f"<li>{a}</li>" for a in attendees)
    return f"""
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background:#0a0a0a; color:#e5e5e5; padding:24px;">
  <div style="max-width:600px; margin:0 auto; background:#141414; border:1px solid #262626; border-radius:16px; padding:32px;">
    <h1 style="color:#22c55e; margin:0 0 8px;">📅 Meeting Invitation</h1>
    <p style="color:#a3a3a3; margin:0 0 24px;">You're invited to a meeting hosted by {host_name}</p>

    <h2 style="color:#fff; margin:0 0 16px;">{title}</h2>

    <table style="width:100%; margin-bottom:24px;">
      <tr><td style="color:#a3a3a3; padding:4px 0;">📆 Date</td><td style="color:#fff;">{date_str}</td></tr>
      <tr><td style="color:#a3a3a3; padding:4px 0;">⏰ Time</td><td style="color:#fff;">{time_str} ({duration_minutes} min)</td></tr>
    </table>

    <div style="background:#0a0a0a; padding:16px; border-radius:8px; margin-bottom:24px;">
      <p style="color:#a3a3a3; margin:0 0 8px; font-size:12px;">AGENDA</p>
      <p style="color:#e5e5e5; margin:0; white-space:pre-wrap;">{agenda}</p>
    </div>

    <a href="{meet_link}" style="display:inline-block; background:#22c55e; color:#000; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600;">
      Join Google Meet
    </a>

    <p style="color:#737373; font-size:12px; margin-top:24px;">
      Or copy this link: <a href="{meet_link}" style="color:#22c55e;">{meet_link}</a>
    </p>

    <hr style="border:none; border-top:1px solid #262626; margin:24px 0;" />

    <p style="color:#a3a3a3; font-size:12px; margin:0 0 8px;">ATTENDEES</p>
    <ul style="color:#e5e5e5; font-size:14px; margin:0; padding-left:20px;">{attendees_html}</ul>

    <p style="color:#737373; font-size:11px; margin-top:24px;">Sent by GOG OMS</p>
  </div>
</body>
</html>
"""
