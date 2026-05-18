"""
Lightweight MongoDB-backed job queue.

A single in-process worker_loop polls the `jobs` collection every few
seconds, atomically claims one pending job, dispatches it to the
registered handler for its type, and marks it completed/failed.

For higher throughput, the same loop can be moved to a separate worker
container later — handlers operate on dicts and need no other change.
"""
from __future__ import annotations
import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import Awaitable, Callable, Optional

log = logging.getLogger(__name__)

POLL_INTERVAL_SECONDS = 2
# If a job sits in "processing" longer than this it is reclaimed — guards
# against workers that crashed between claiming and completing.
STALE_PROCESSING_SECONDS = 300

JobHandler = Callable[[dict], Awaitable[None]]
_handlers: dict[str, JobHandler] = {}
_worker_task: Optional[asyncio.Task] = None
_stop = asyncio.Event()


def register(job_type: str, handler: JobHandler) -> None:
    """Register an async handler for a given job type."""
    _handlers[job_type] = handler


async def enqueue(db, job_type: str, payload: dict) -> str:
    """Insert a pending job and return its id."""
    job_id = str(uuid.uuid4())
    await db.jobs.insert_one({
        "_id": job_id,
        "type": job_type,
        "payload": payload,
        "status": "pending",
        "attempts": 0,
        "created_at": datetime.utcnow(),
    })
    log.info("jobs.enqueue: type=%s id=%s", job_type, job_id)
    return job_id


async def _claim_next(db) -> Optional[dict]:
    """Atomically pick the oldest pending job and mark it processing."""
    now = datetime.utcnow()
    # First: recover any stale "processing" jobs whose worker died
    stale_cutoff = now - timedelta(seconds=STALE_PROCESSING_SECONDS)
    await db.jobs.update_many(
        {"status": "processing", "started_at": {"$lt": stale_cutoff}},
        {"$set": {"status": "pending"}},
    )
    return await db.jobs.find_one_and_update(
        {"status": "pending"},
        {"$set": {"status": "processing", "started_at": now},
         "$inc": {"attempts": 1}},
        sort=[("created_at", 1)],
    )


async def _mark_complete(db, job_id: str) -> None:
    await db.jobs.update_one(
        {"_id": job_id},
        {"$set": {"status": "completed", "completed_at": datetime.utcnow()}},
    )


async def _mark_failed(db, job_id: str, error: str) -> None:
    await db.jobs.update_one(
        {"_id": job_id},
        {"$set": {
            "status": "failed",
            "completed_at": datetime.utcnow(),
            "error": error[:2000],
        }},
    )


async def worker_loop() -> None:
    """Forever-running coroutine that drains the job queue."""
    from app.core.database import get_database
    log.info("jobs.worker_loop: started")
    while not _stop.is_set():
        try:
            db = get_database()
            job = await _claim_next(db)
            if job is None:
                await asyncio.sleep(POLL_INTERVAL_SECONDS)
                continue
            handler = _handlers.get(job["type"])
            if handler is None:
                log.warning("jobs.worker_loop: no handler for type=%s", job["type"])
                await _mark_failed(db, job["_id"], f"no handler for type={job['type']}")
                continue
            try:
                log.info("jobs.worker_loop: dispatch type=%s id=%s", job["type"], job["_id"])
                await handler(job)
                await _mark_complete(db, job["_id"])
            except Exception as e:
                log.exception("jobs.worker_loop: handler failed id=%s", job["_id"])
                await _mark_failed(db, job["_id"], str(e))
        except Exception:
            # Never let the loop itself die from a transient mongo blip
            log.exception("jobs.worker_loop: unexpected error, sleeping")
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
    log.info("jobs.worker_loop: stopped")


def start_worker() -> None:
    """Spawn the worker_loop task. Idempotent."""
    global _worker_task
    if _worker_task is not None and not _worker_task.done():
        return
    _stop.clear()
    _worker_task = asyncio.create_task(worker_loop())


async def stop_worker() -> None:
    """Signal the worker to stop and wait for it."""
    global _worker_task
    _stop.set()
    if _worker_task is not None:
        try:
            await asyncio.wait_for(_worker_task, timeout=5)
        except asyncio.TimeoutError:
            _worker_task.cancel()
        _worker_task = None
