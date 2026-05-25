"""Google Calendar OAuth + event fetch helpers."""
from __future__ import annotations
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx

from app.core.config import settings

log = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]
TOKEN_URL = "https://oauth2.googleapis.com/token"
EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


def build_auth_url(state: str) -> str:
    import urllib.parse
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)


async def exchange_code(code: str) -> dict:
    """Exchange auth code for tokens. Returns raw token dict."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(TOKEN_URL, data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        })
        resp.raise_for_status()
        return resp.json()


async def refresh_access_token(refresh_token: str) -> dict:
    """Refresh an expired access token. Returns raw token dict."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(TOKEN_URL, data={
            "refresh_token": refresh_token,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "grant_type": "refresh_token",
        })
        resp.raise_for_status()
        return resp.json()


async def get_account_email(access_token: str) -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.get(USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
        resp.raise_for_status()
        return resp.json().get("email", "")


async def list_events(access_token: str, window_days: int = 14) -> list[dict]:
    """Fetch events from primary calendar for the next window_days days."""
    now = datetime.now(timezone.utc)
    time_min = now.isoformat()
    time_max = (now + timedelta(days=window_days)).isoformat()

    async with httpx.AsyncClient() as client:
        resp = await client.get(EVENTS_URL, params={
            "timeMin": time_min,
            "timeMax": time_max,
            "singleEvents": "true",
            "orderBy": "startTime",
            "maxResults": 50,
        }, headers={"Authorization": f"Bearer {access_token}"})
        resp.raise_for_status()
        return resp.json().get("items", [])


def parse_event(item: dict, integration_id: str, user_id: str) -> Optional[dict]:
    """Convert a Google Calendar event item into a calendar_events doc."""
    start_raw = item.get("start", {})
    end_raw = item.get("end", {})

    all_day = "date" in start_raw and "dateTime" not in start_raw

    try:
        if all_day:
            start = datetime.fromisoformat(start_raw["date"])
            end = datetime.fromisoformat(end_raw["date"])
        else:
            start = datetime.fromisoformat(start_raw["dateTime"].replace("Z", "+00:00"))
            end = datetime.fromisoformat(end_raw["dateTime"].replace("Z", "+00:00"))
    except (KeyError, ValueError):
        return None

    return {
        "user_id": user_id,
        "integration_id": integration_id,
        "provider": "google",
        "provider_event_id": item["id"],
        "title": item.get("summary", "(No title)"),
        "start": start,
        "end": end,
        "all_day": all_day,
        "location": item.get("location"),
    }
