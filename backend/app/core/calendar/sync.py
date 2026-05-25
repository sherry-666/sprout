"""Calendar sync logic — refresh tokens, fetch events, upsert to MongoDB."""
from __future__ import annotations
import logging
import uuid
from datetime import datetime, timezone

from app.core.calendar import google as google_cal
from app.core.calendar import microsoft as ms_cal

log = logging.getLogger(__name__)


async def sync_integration(db, integration_id: str) -> None:
    """
    Refresh tokens if expired, fetch next 14 days of events,
    upsert into calendar_events, delete stale events, stamp last_synced_at.
    """
    doc = await db.calendar_integrations.find_one({"_id": integration_id})
    if not doc:
        log.warning("sync_integration: integration %s not found", integration_id)
        return

    provider = doc["provider"]
    user_id = doc["user_id"]
    access_token = doc.get("access_token")
    refresh_token = doc.get("refresh_token")
    expires_at = doc.get("expires_at")

    if provider == "apple":
        # Apple events are read on-device; nothing to sync server-side.
        await db.calendar_integrations.update_one(
            {"_id": integration_id},
            {"$set": {"last_synced_at": datetime.utcnow(), "updated_at": datetime.utcnow()}},
        )
        return

    # Refresh token if within 5 minutes of expiry or already expired
    now = datetime.now(timezone.utc)
    needs_refresh = expires_at is None or (
        expires_at.replace(tzinfo=timezone.utc) - now
    ).total_seconds() < 300

    if needs_refresh and refresh_token:
        try:
            if provider == "google":
                token_data = await google_cal.refresh_access_token(refresh_token)
            else:
                token_data = await ms_cal.refresh_access_token(refresh_token)

            access_token = token_data["access_token"]
            expires_in = token_data.get("expires_in", 3600)
            expires_at = datetime.utcnow().replace(tzinfo=None)
            from datetime import timedelta
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

            update_fields: dict = {
                "access_token": access_token,
                "expires_at": expires_at,
                "updated_at": datetime.utcnow(),
            }
            if "refresh_token" in token_data:
                update_fields["refresh_token"] = token_data["refresh_token"]

            await db.calendar_integrations.update_one(
                {"_id": integration_id}, {"$set": update_fields}
            )
        except Exception:
            log.exception("sync_integration: token refresh failed for %s", integration_id)
            return

    if not access_token:
        log.warning("sync_integration: no access_token for %s", integration_id)
        return

    # Fetch events from provider
    try:
        if provider == "google":
            raw_events = await google_cal.list_events(access_token)
            parse_fn = google_cal.parse_event
        else:
            raw_events = await ms_cal.list_events(access_token)
            parse_fn = ms_cal.parse_event
    except Exception:
        log.exception("sync_integration: event fetch failed for %s", integration_id)
        return

    # Upsert events
    seen_provider_ids: set[str] = set()
    for item in raw_events:
        parsed = parse_fn(item, integration_id, user_id)
        if parsed is None:
            continue
        provider_event_id = parsed["provider_event_id"]
        seen_provider_ids.add(provider_event_id)

        now_dt = datetime.utcnow()
        await db.calendar_events.update_one(
            {"integration_id": integration_id, "provider_event_id": provider_event_id},
            {"$set": {**parsed, "updated_at": now_dt},
             "$setOnInsert": {"_id": str(uuid.uuid4()), "created_at": now_dt}},
            upsert=True,
        )

    # Delete events no longer returned by the provider
    if seen_provider_ids:
        await db.calendar_events.delete_many({
            "integration_id": integration_id,
            "provider_event_id": {"$nin": list(seen_provider_ids)},
        })
    else:
        # No events returned — clear all cached events for this integration
        await db.calendar_events.delete_many({"integration_id": integration_id})

    await db.calendar_integrations.update_one(
        {"_id": integration_id},
        {"$set": {"last_synced_at": datetime.utcnow(), "updated_at": datetime.utcnow()}},
    )
    log.info(
        "sync_integration: synced %d events for integration %s (provider=%s)",
        len(seen_provider_ids), integration_id, provider,
    )
