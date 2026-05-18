"""
Background job processor for Quick Log analysis.

Replaces the synchronous analyzeQuickLog flow. Streams progress messages,
draft cards, and the final status into a conversation as work completes,
so the educator can leave the screen and come back when drafts are ready.
"""
from __future__ import annotations
import logging
from datetime import datetime

from app.core.database import get_database
from app.core import jobs as job_queue
from app.core.storage import get_object, safe_presign_get
from app.graphql.agents import write_message, update_conversation_status
from app.models.conversation import (
    CONVO_PROCESSING, CONVO_AWAITING_REVIEW, CONVO_FAILED,
    KIND_TEXT, KIND_PROGRESS, KIND_DRAFT_CARD,
    ROLE_AGENT, JOB_QUICK_LOG_ANALYSIS,
)

log = logging.getLogger(__name__)


async def _process_quick_log(job: dict) -> None:
    """Drive a Quick Log conversation through analysis and draft generation."""
    from app.ai.face_recognizer import match_faces
    from app.ai.voice_parser import parse_transcript, describe_scene, generate_photo_update

    payload = job.get("payload") or {}
    convo_id: str = payload["conversation_id"]
    viewer_id: str = payload["user_id"]
    class_id = payload.get("class_id")
    transcript: str = payload.get("transcript") or ""
    photo_keys: list[str] = payload.get("photo_keys") or []

    db = get_database()
    await update_conversation_status(db, convo_id, CONVO_PROCESSING)

    try:
        # ── Collect eligible kids in scope ───────────────────────────────
        if class_id:
            cls_doc = await db.classes.find_one({"_id": str(class_id)})
            kid_ids = cls_doc.get("kid_ids", []) if cls_doc else []
            kids = await db.kids.find({"_id": {"$in": kid_ids}}).to_list(200)
        else:
            educator_classes = await db.classes.find(
                {"educator_user_ids": viewer_id}
            ).to_list(50)
            all_kid_ids = list({k for cls in educator_classes for k in cls.get("kid_ids", [])})
            kids = await db.kids.find({"_id": {"$in": all_kid_ids}}).to_list(500)

        kid_map = {k["_id"]: k for k in kids}
        candidates = {k["_id"]: k["faceEmbedding"] for k in kids if k.get("faceEmbedding")}

        # ── Voice: parse transcript into per-kid suggestions ─────────────
        voice_suggestions: list[dict] = []
        if transcript.strip():
            await write_message(
                db, convo_id, role=ROLE_AGENT, kind=KIND_PROGRESS,
                content="Reading your voice note…",
            )
            kids_info = [
                {"id": k["_id"], "name": f"{k.get('firstName','')} {k.get('lastName','')}".strip()}
                for k in kids
            ]
            voice_suggestions = await parse_transcript(transcript, kids_info)
        voice_map = {s["kid_id"]: s["content"] for s in voice_suggestions}

        # ── Photos: face match + scene description per photo ────────────
        photo_kid_map: dict[str, list[str]] = {}
        photo_scenes: dict[str, str] = {}
        photo_urls: dict[str, str] = {}

        total_photos = len(photo_keys)
        for i, pk in enumerate(photo_keys, start=1):
            await write_message(
                db, convo_id, role=ROLE_AGENT, kind=KIND_PROGRESS,
                content=f"Analysing photo {i} of {total_photos}…",
            )
            try:
                photo_bytes = get_object(pk)
            except Exception as e:
                log.warning("quick_log_processor: cannot fetch photo %s: %s", pk, e)
                continue
            detected = match_faces(photo_bytes, candidates)
            detected_ids = [kid_id for kid_id, _ in detected]
            photo_kid_map[pk] = detected_ids
            scene = await describe_scene(photo_bytes)
            photo_scenes[pk] = scene
            photo_urls[pk] = safe_presign_get(pk) or ""

        # ── Build per-kid draft cards ────────────────────────────────────
        kid_photo_map: dict[str, list[str]] = {}
        for pk, kid_ids in photo_kid_map.items():
            for kid_id in kid_ids:
                kid_photo_map.setdefault(kid_id, []).append(pk)

        involved = set(voice_map.keys()) | {kid_id for ids in photo_kid_map.values() for kid_id in ids}
        if not involved and transcript.strip():
            await write_message(
                db, convo_id, role=ROLE_AGENT, kind=KIND_TEXT,
                content="I couldn't match the voice note to any specific child — "
                        "you can still type and send an update manually from here.",
            )

        for kid_id in involved:
            kid = kid_map.get(str(kid_id))
            if not kid:
                continue
            kid_name = f"{kid.get('firstName','')} {kid.get('lastName','')}".strip()
            content = voice_map.get(str(kid_id), "")
            kid_photos = kid_photo_map.get(str(kid_id), [])
            if not content and kid_photos:
                scenes = [photo_scenes.get(pk, "") for pk in kid_photos if photo_scenes.get(pk)]
                if scenes:
                    combined = " ".join(scenes[:2])
                    content = await generate_photo_update(
                        kid_name=kid_name,
                        scene_description=combined,
                        transcript=transcript,
                    )
            if not content:
                continue
            avatar_url = None
            ppk = kid.get("profilePhotoKey")
            if ppk:
                avatar_url = safe_presign_get(ppk)
            await write_message(
                db, convo_id, role=ROLE_AGENT, kind=KIND_DRAFT_CARD,
                content=content,
                payload={
                    "kid_id": str(kid_id),
                    "kid_name": kid_name,
                    "avatar_url": avatar_url,
                    "photo_keys": kid_photos,
                    "photo_urls": [photo_urls.get(pk, "") for pk in kid_photos],
                },
            )

        # ── Closing message + transition to awaiting_review ──────────────
        await write_message(
            db, convo_id, role=ROLE_AGENT, kind=KIND_TEXT,
            content="Drafts are ready. Review and edit below, then tap "
                    "\"Send to parents\" to deliver them.",
        )
        await update_conversation_status(db, convo_id, CONVO_AWAITING_REVIEW)
    except Exception as e:
        log.exception("quick_log_processor: failed for convo=%s", convo_id)
        await write_message(
            db, convo_id, role=ROLE_AGENT, kind=KIND_TEXT,
            content=f"Sorry — something went wrong while analysing this: {e}",
        )
        await update_conversation_status(db, convo_id, CONVO_FAILED, error=str(e))


def register_quick_log_handler() -> None:
    """Wire the processor into the job queue. Called once at app startup."""
    job_queue.register(JOB_QUICK_LOG_ANALYSIS, _process_quick_log)
