"""
Google Calendar service.

Creates a Calendar event with conferenceData -> Google Meet auto-generates the link.
Attendees get email invites automatically from Google (sendUpdates=all).

OAuth flow:
1. User clicks "Connect Google" -> /auth/google/login
2. Redirects to Google consent screen
3. Callback /auth/google/callback stores tokens in DB
4. Use stored tokens to call Calendar API on user's behalf
"""
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Optional

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from app.core.config import settings
from app.models.user import User
from sqlalchemy.orm import Session


SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "openid",
]


def _client_config() -> Dict:
    return {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
        }
    }


def get_authorization_url(state: str) -> str:
    """Step 1: Generate Google consent screen URL"""
    flow = Flow.from_client_config(_client_config(), scopes=SCOPES, state=state)
    flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",  # force refresh_token
    )
    return auth_url


def exchange_code_for_tokens(code: str, state: str) -> Dict:
    """Step 2: Exchange auth code for access + refresh tokens"""
    flow = Flow.from_client_config(_client_config(), scopes=SCOPES, state=state)
    flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
    flow.fetch_token(code=code)
    creds = flow.credentials

    # Get user info
    userinfo_service = build("oauth2", "v2", credentials=creds)
    userinfo = userinfo_service.userinfo().get().execute()

    return {
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "expiry": creds.expiry,
        "email": userinfo.get("email"),
        "name": userinfo.get("name"),
        "picture": userinfo.get("picture"),
    }


def _get_credentials(user: User) -> Credentials:
    """Build Credentials object from stored DB tokens, auto-refresh if needed"""
    creds = Credentials(
        token=user.google_access_token,
        refresh_token=user.google_refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        scopes=SCOPES,
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
    return creds


def create_calendar_event(
    user: User,
    db: Session,
    *,
    title: str,
    description: str,
    start_datetime: datetime,
    end_datetime: datetime,
    timezone: str,
    attendee_emails: List[str],
    recurrence_rule: Optional[str] = None,  # e.g. "RRULE:FREQ=DAILY;COUNT=10"
) -> Dict:
    """
    Create a Google Calendar event with auto-generated Google Meet link.

    Google handles:
    - Generating the meet.google.com link
    - Sending email invites to all attendees
    - Adding to attendees' calendars
    - Sending reminders
    """
    creds = _get_credentials(user)
    service = build("calendar", "v3", credentials=creds)

    event_body = {
        "summary": title,
        "description": description,
        "start": {
            "dateTime": start_datetime.isoformat(),
            "timeZone": timezone,
        },
        "end": {
            "dateTime": end_datetime.isoformat(),
            "timeZone": timezone,
        },
        "attendees": [{"email": email} for email in attendee_emails],
        "conferenceData": {
            "createRequest": {
                "requestId": f"gog-{uuid.uuid4().hex}",
                "conferenceSolutionKey": {"type": "hangoutsMeet"},
            }
        },
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "email", "minutes": 60},
                {"method": "popup", "minutes": 15},
            ],
        },
    }

    if recurrence_rule:
        event_body["recurrence"] = [recurrence_rule]

    event = service.events().insert(
        calendarId="primary",
        body=event_body,
        conferenceDataVersion=1,
        sendUpdates="all",  # send email invites to all attendees
    ).execute()

    # Extract Meet link
    meet_link = None
    for entry in event.get("conferenceData", {}).get("entryPoints", []):
        if entry.get("entryPointType") == "video":
            meet_link = entry.get("uri")
            break

    # Persist refreshed token if rotated
    user.google_access_token = creds.token
    if creds.expiry:
        user.google_token_expiry = creds.expiry
    db.commit()

    return {
        "event_id": event.get("id"),
        "meet_link": meet_link,
        "calendar_link": event.get("htmlLink"),
        "raw": event,
    }


def build_recurrence_rule(recurrence_type: str, end_date: Optional[datetime] = None) -> Optional[str]:
    """Convert simple recurrence_type into RFC 5545 RRULE"""
    mapping = {
        "daily": "FREQ=DAILY",
        "weekly": "FREQ=WEEKLY",
        "biweekly": "FREQ=WEEKLY;INTERVAL=2",
        "monthly": "FREQ=MONTHLY",
    }
    base = mapping.get(recurrence_type)
    if not base:
        return None
    if end_date:
        # UNTIL must be UTC in YYYYMMDDTHHMMSSZ
        until = end_date.strftime("%Y%m%dT235959Z")
        base += f";UNTIL={until}"
    return f"RRULE:{base}"
