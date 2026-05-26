"""Google OAuth flow + session token issuance"""
import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.services import google_calendar
from app.core.security import create_access_token, get_current_user
from app.core.config import settings


router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory state store (for production use Redis or signed cookies)
_oauth_states = {}


@router.get("/google/login")
async def google_login():
    """Redirect user to Google OAuth consent screen"""
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = True
    auth_url = google_calendar.get_authorization_url(state)
    return {"auth_url": auth_url, "state": state}


@router.get("/google/callback")
async def google_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db),
):
    """Handle Google OAuth callback - store tokens and issue JWT"""
    if state not in _oauth_states:
        raise HTTPException(400, "Invalid state")
    _oauth_states.pop(state, None)

    try:
        tokens = google_calendar.exchange_code_for_tokens(code, state)
    except Exception as e:
        raise HTTPException(400, f"Token exchange failed: {e}")

    # Upsert user
    user = db.query(User).filter(User.email == tokens["email"]).first()
    if not user:
        user = User(
            email=tokens["email"],
            name=tokens["name"],
            picture=tokens.get("picture"),
        )
        db.add(user)

    user.google_access_token = tokens["access_token"]
    if tokens.get("refresh_token"):
        user.google_refresh_token = tokens["refresh_token"]
    if tokens.get("expiry"):
        user.google_token_expiry = tokens["expiry"]
    user.name = tokens["name"]
    user.picture = tokens.get("picture")

    db.commit()
    db.refresh(user)

    jwt_token = create_access_token({"sub": str(user.id), "email": user.email})

    # Redirect to frontend with token
    return RedirectResponse(
        url=f"{settings.FRONTEND_URL}/auth/callback?token={jwt_token}",
        status_code=302,
    )


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "role": user.role,
        "department": user.department,
        "has_google_connected": bool(user.google_refresh_token),
    }
