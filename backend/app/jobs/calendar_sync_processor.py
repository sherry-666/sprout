"""Job handler for syncing a calendar integration."""
from __future__ import annotations
import logging

from app.core.database import get_database
from app.core import jobs as job_queue
from app.core.calendar.sync import sync_integration

log = logging.getLogger(__name__)

JOB_CALENDAR_SYNC = "calendar_sync"


async def _process_calendar_sync(job: dict) -> None:
    payload = job.get("payload") or {}
    integration_id: str = payload["integration_id"]
    db = get_database()
    await sync_integration(db, integration_id)


def register_calendar_sync_handler() -> None:
    job_queue.register(JOB_CALENDAR_SYNC, _process_calendar_sync)
