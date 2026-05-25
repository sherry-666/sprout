"""GraphQL types, queries, and mutations for calendar integrations."""
from __future__ import annotations
import logging
import uuid
from datetime import datetime
from typing import Optional, List
from enum import Enum

import strawberry
from strawberry.types import Info

from app.graphql.context import GraphQLContext
from app.graphql.permissions import IsAuthenticated
from app.graphql.scalars import DateTime
from app.core import jobs as job_queue
from app.jobs.calendar_sync_processor import JOB_CALENDAR_SYNC

log = logging.getLogger(__name__)


# ─── Enums ────────────────────────────────────────────────────────────────────

@strawberry.enum
class CalendarProvider(str, Enum):
    google = "google"
    microsoft = "microsoft"
    apple = "apple"


# ─── Types ────────────────────────────────────────────────────────────────────

@strawberry.type
class CalendarIntegration:
    id: strawberry.ID
    provider: CalendarProvider
    provider_account_email: str
    last_synced_at: Optional[DateTime]
    created_at: DateTime

    @classmethod
    def from_doc(cls, doc: dict) -> CalendarIntegration:
        return cls(
            id=strawberry.ID(str(doc["_id"])),
            provider=CalendarProvider(doc["provider"]),
            provider_account_email=doc.get("provider_account_email", ""),
            last_synced_at=doc.get("last_synced_at"),
            created_at=doc.get("created_at", datetime.utcnow()),
        )


@strawberry.type
class CalendarEvent:
    id: strawberry.ID
    provider: CalendarProvider
    title: str
    start: DateTime
    end: DateTime
    all_day: bool
    location: Optional[str]

    @classmethod
    def from_doc(cls, doc: dict) -> CalendarEvent:
        return cls(
            id=strawberry.ID(str(doc["_id"])),
            provider=CalendarProvider(doc["provider"]),
            title=doc.get("title", ""),
            start=doc["start"],
            end=doc["end"],
            all_day=doc.get("all_day", False),
            location=doc.get("location"),
        )


@strawberry.type
class CalendarOAuthRedirect:
    authorization_url: str


# ─── Query mixin ─────────────────────────────────────────────────────────────

@strawberry.type
class CalendarQuery:

    @strawberry.field(permission_classes=[IsAuthenticated])
    async def my_calendar_integrations(
        self,
        info: Info[GraphQLContext, None],
    ) -> List[CalendarIntegration]:
        db = info.context.db
        user_id = info.context.viewer_id
        docs = await db.calendar_integrations.find({"user_id": user_id}).to_list(10)
        return [CalendarIntegration.from_doc(d) for d in docs]

    @strawberry.field(permission_classes=[IsAuthenticated])
    async def my_calendar_events(
        self,
        info: Info[GraphQLContext, None],
        from_dt: DateTime,
        to_dt: DateTime,
    ) -> List[CalendarEvent]:
        db = info.context.db
        user_id = info.context.viewer_id
        docs = await db.calendar_events.find({
            "user_id": user_id,
            "start": {"$gte": from_dt, "$lte": to_dt},
        }).sort("start", 1).to_list(100)
        return [CalendarEvent.from_doc(d) for d in docs]


# ─── Mutation mixin ───────────────────────────────────────────────────────────

@strawberry.type
class CalendarMutation:

    @strawberry.mutation(permission_classes=[IsAuthenticated])
    async def begin_calendar_oauth(
        self,
        info: Info[GraphQLContext, None],
        provider: CalendarProvider,
    ) -> CalendarOAuthRedirect:
        from app.routes.oauth import build_google_auth_url, build_microsoft_auth_url
        user_id = info.context.viewer_id

        if provider == CalendarProvider.google:
            url = build_google_auth_url(user_id)
        elif provider == CalendarProvider.microsoft:
            url = build_microsoft_auth_url(user_id)
        else:
            raise ValueError("Use registerAppleCalendar for Apple")

        return CalendarOAuthRedirect(authorization_url=url)

    @strawberry.mutation(permission_classes=[IsAuthenticated])
    async def register_apple_calendar(
        self,
        info: Info[GraphQLContext, None],
    ) -> CalendarIntegration:
        """Create a stub integration record so the UI knows Apple is linked."""
        db = info.context.db
        user_id = info.context.viewer_id

        existing = await db.calendar_integrations.find_one(
            {"user_id": user_id, "provider": "apple"}
        )
        if existing:
            return CalendarIntegration.from_doc(existing)

        now = datetime.utcnow()
        integration_id = str(uuid.uuid4())
        doc = {
            "_id": integration_id,
            "user_id": user_id,
            "provider": "apple",
            "provider_account_email": "This device",
            "access_token": None,
            "refresh_token": None,
            "expires_at": None,
            "scopes": [],
            "last_synced_at": None,
            "created_at": now,
            "updated_at": now,
        }
        await db.calendar_integrations.insert_one(doc)
        return CalendarIntegration.from_doc(doc)

    @strawberry.mutation(permission_classes=[IsAuthenticated])
    async def delink_calendar(
        self,
        info: Info[GraphQLContext, None],
        integration_id: strawberry.ID,
    ) -> bool:
        db = info.context.db
        user_id = info.context.viewer_id

        doc = await db.calendar_integrations.find_one(
            {"_id": str(integration_id), "user_id": user_id}
        )
        if not doc:
            return False

        await db.calendar_events.delete_many({"integration_id": str(integration_id)})
        await db.calendar_integrations.delete_one({"_id": str(integration_id)})
        log.info("delink_calendar: user %s delinked %s integration %s", user_id, doc["provider"], integration_id)
        return True

    @strawberry.mutation(permission_classes=[IsAuthenticated])
    async def sync_calendar_now(
        self,
        info: Info[GraphQLContext, None],
        integration_id: strawberry.ID,
    ) -> CalendarIntegration:
        db = info.context.db
        user_id = info.context.viewer_id

        doc = await db.calendar_integrations.find_one(
            {"_id": str(integration_id), "user_id": user_id}
        )
        if not doc:
            raise ValueError("Integration not found")

        await job_queue.enqueue(db, JOB_CALENDAR_SYNC, {"integration_id": str(integration_id)})
        return CalendarIntegration.from_doc(doc)
