"""Microsoft Graph (Outlook) Calendar OAuth + event fetch helpers."""
from __future__ import annotations
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx

from app.core.config import settings

log = logging.getLogger(__name__)

SCOPES = ["Calendars.Read", "User.Read", "offline_access"]
AUTHORITY = "https://login.microsoftonline.com/common"
TOKEN_URL = f"{AUTHORITY}/oauth2/v2.0/token"
EVENTS_URL = "https://graph.microsoft.com/v1.0/me/calendarview"
ME_URL = "https://graph.microsoft.com/v1.0/me"


def build_auth_url(state: str) -> str:
    import urllib.parse
    params = {
        "client_id": settings.MICROSOFT_CLIENT_ID,
        "redirect_uri": settings.MICROSOFT_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "state": state,
        "response_mode": "query",
    }
    return f"{AUTHORITY}/oauth2/v2.0/authorize?" + urllib.parse.urlencode(params)


async def exchange_code(code: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(TOKEN_URL, data={
            "code": code,
            "client_id": settings.MICROSOFT_CLIENT_ID,
            "client_secret": settings.MICROSOFT_CLIENT_SECRET,
            "redirect_uri": settings.MICROSOFT_REDIRECT_URI,
            "grant_type": "authorization_code",
        })
        resp.raise_for_status()
        return resp.json()


async def refresh_access_token(refresh_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(TOKEN_URL, data={
            "refresh_token": refresh_token,
            "client_id": settings.MICROSOFT_CLIENT_ID,
            "client_secret": settings.MICROSOFT_CLIENT_SECRET,
            "grant_type": "refresh_token",
        })
        resp.raise_for_status()
        return resp.json()


async def get_account_email(access_token: str) -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.get(ME_URL, headers={"Authorization": f"Bearer {access_token}"})
        resp.raise_for_status()
        return resp.json().get("mail") or resp.json().get("userPrincipalName", "")


async def list_events(access_token: str, window_days: int = 14) -> list[dict]:
    """Fetch calendar events via Microsoft Graph calendarview endpoint."""
    now = datetime.now(timezone.utc)
    start_dt = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    end_dt = (now + timedelta(days=window_days)).strftime("%Y-%m-%dT%H:%M:%SZ")

    async with httpx.AsyncClient() as client:
        resp = await client.get(EVENTS_URL, params={
            "startDateTime": start_dt,
            "endDateTime": end_dt,
            "$top": 50,
            "$select": "id,subject,start,end,isAllDay,location",
            "$orderby": "start/dateTime",
        }, headers={
            "Authorization": f"Bearer {access_token}",
            "Prefer": 'outlook.timezone="UTC"',
        })
        resp.raise_for_status()
        return resp.json().get("value", [])


def parse_event(item: dict, integration_id: str, user_id: str) -> Optional[dict]:
    """Convert a Microsoft Graph event into a calendar_events doc."""
    try:
        all_day = item.get("isAllDay", False)
        start_str = item["start"]["dateTime"]
        end_str = item["end"]["dateTime"]
        start = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
        end = datetime.fromisoformat(end_str.replace("Z", "+00:00"))
    except (KeyError, ValueError):
        return None

    location = None
    loc = item.get("location", {})
    if isinstance(loc, dict):
        location = loc.get("displayName") or None

    return {
        "user_id": user_id,
        "integration_id": integration_id,
        "provider": "microsoft",
        "provider_event_id": item["id"],
        "title": item.get("subject", "(No title)"),
        "start": start,
        "end": end,
        "all_day": all_day,
        "location": location,
    }
