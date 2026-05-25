"""OAuth callback endpoints for calendar integrations (Google + Microsoft)."""
from __future__ import annotations
import logging
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from jose import jwt, JWTError

from app.core.config import settings
from app.core.database import get_database
from app.core import jobs as job_queue
from app.core.calendar import google as google_cal
from app.core.calendar import microsoft as ms_cal
from app.jobs.calendar_sync_processor import JOB_CALENDAR_SYNC

log = logging.getLogger(__name__)

router = APIRouter(prefix="/oauth", tags=["oauth"])

_ALGO = "HS256"
_STATE_TTL_MINUTES = 15


def _build_state(user_id: str) -> str:
    """Create a signed JWT to use as the OAuth state parameter (CSRF protection)."""
    expire = datetime.utcnow() + timedelta(minutes=_STATE_TTL_MINUTES)
    return jwt.encode(
        {"sub": user_id, "exp": expire},
        settings.OAUTH_STATE_SECRET,
        algorithm=_ALGO,
    )


def _verify_state(state: str) -> str:
    """Verify state JWT and return the user_id it contains."""
    try:
        payload = jwt.decode(state, settings.OAUTH_STATE_SECRET, algorithms=[_ALGO])
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("missing sub")
        return user_id
    except JWTError as e:
        raise HTTPException(status_code=400, detail=f"Invalid OAuth state: {e}")


async def _upsert_integration(
    db,
    user_id: str,
    provider: str,
    token_data: dict,
    account_email: str,
) -> str:
    """Create or update a calendar_integrations document and return its _id."""
    access_token = token_data["access_token"]
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in", 3600)
    expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

    existing = await db.calendar_integrations.find_one({"user_id": user_id, "provider": provider})
    if existing:
        integration_id = str(existing["_id"])
        update: dict = {
            "access_token": access_token,
            "expires_at": expires_at,
            "provider_account_email": account_email,
            "updated_at": datetime.utcnow(),
        }
        if refresh_token:
            update["refresh_token"] = refresh_token
        await db.calendar_integrations.update_one({"_id": integration_id}, {"$set": update})
    else:
        integration_id = str(uuid.uuid4())
        doc = {
            "_id": integration_id,
            "user_id": user_id,
            "provider": provider,
            "provider_account_email": account_email,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_at": expires_at,
            "scopes": [],
            "last_synced_at": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        await db.calendar_integrations.insert_one(doc)

    return integration_id


def _deep_link(provider: str) -> str:
    return f"sprout://oauth-success?provider={provider}"


@router.get("/google/callback")
async def google_callback(
    code: str = Query(...),
    state: str = Query(...),
    error: str = Query(None),
):
    if error:
        log.warning("google_callback: user denied OAuth: %s", error)
        return RedirectResponse("sprout://oauth-error?provider=google")

    user_id = _verify_state(state)
    db = get_database()

    try:
        token_data = await google_cal.exchange_code(code)
        email = await google_cal.get_account_email(token_data["access_token"])
    except Exception:
        log.exception("google_callback: token exchange failed")
        raise HTTPException(status_code=502, detail="Failed to exchange Google OAuth code")

    integration_id = await _upsert_integration(db, user_id, "google", token_data, email)

    # Kick off an immediate sync
    await job_queue.enqueue(db, JOB_CALENDAR_SYNC, {"integration_id": integration_id})

    return RedirectResponse(_deep_link("google"))


@router.get("/microsoft/callback")
async def microsoft_callback(
    code: str = Query(...),
    state: str = Query(...),
    error: str = Query(None),
):
    if error:
        log.warning("microsoft_callback: user denied OAuth: %s", error)
        return RedirectResponse("sprout://oauth-error?provider=microsoft")

    user_id = _verify_state(state)
    db = get_database()

    try:
        token_data = await ms_cal.exchange_code(code)
        email = await ms_cal.get_account_email(token_data["access_token"])
    except Exception:
        log.exception("microsoft_callback: token exchange failed")
        raise HTTPException(status_code=502, detail="Failed to exchange Microsoft OAuth code")

    integration_id = await _upsert_integration(db, user_id, "microsoft", token_data, email)

    await job_queue.enqueue(db, JOB_CALENDAR_SYNC, {"integration_id": integration_id})

    return RedirectResponse(_deep_link("microsoft"))


def build_google_auth_url(user_id: str) -> str:
    return google_cal.build_auth_url(_build_state(user_id))


def build_microsoft_auth_url(user_id: str) -> str:
    return ms_cal.build_auth_url(_build_state(user_id))
