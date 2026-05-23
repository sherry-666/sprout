"""
Quick Log Phase 2: text summarisation.

Triggered by confirmPhotoReview after the educator has reviewed and adjusted
the photo grouping. Reads the current draft_card messages (which now reflect
the educator-confirmed photo assignments), generates update text for each kid
based on the original transcript and their assigned photos, and transitions
the conversation to awaiting_review.
"""
from __future__ import annotations
import asyncio
import logging

from app.core.database import get_database
from app.core import jobs as job_queue
from app.core.storage import get_object
from app.graphql.agents import write_message, update_conversation_status
from app.models.conversation import (
    CONVO_PROCESSING, CONVO_AWAITING_REVIEW, CONVO_FAILED,
    KIND_TEXT, KIND_PROGRESS, KIND_DRAFT_CARD,
    ROLE_AGENT, JOB_QUICK_LOG_SUMMARIZE,
)

log = logging.getLogger(__name__)


async def _process_quick_log_summarize(job: dict) -> None:
    """Phase 2 — generate update text for each confirmed kid draft."""
    from app.ai.voice_parser import parse_transcript, describe_scene, generate_photo_update

    payload = job.get("payload") or {}
    convo_id: str = payload["conversation_id"]
    viewer_id: str = payload["user_id"]

    db = get_database()
    await update_conversation_status(db, convo_id, CONVO_PROCESSING)

    try:
        # ── Load conversation data ────────────────────────────────────────
        convo = await db.conversations.find_one({"_id": convo_id})
        transcript: str = convo.get("transcript", "")
        class_id = convo.get("class_id")

        # ── Collect kids in scope for transcript parsing ─────────────────
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

        # ── Parse transcript for per-kid voice content ───────────────────
        voice_map: dict[str, str] = {}
        if transcript.strip():
            await write_message(
                db, convo_id, role=ROLE_AGENT, kind=KIND_PROGRESS,
                content="Reading your voice note…",
            )
            kids_info = [
                {"id": k["_id"], "name": f"{k.get('firstName', '')} {k.get('lastName', '')}".strip()}
                for k in kids
            ]
            suggestions = await parse_transcript(transcript, kids_info)
            voice_map = {s["kid_id"]: s["content"] for s in suggestions}

        # ── Read current draft cards (educator-confirmed grouping) ────────
        draft_docs = await db.messages.find(
            {"conversation_id": convo_id, "kind": KIND_DRAFT_CARD}
        ).sort("created_at", 1).to_list(100)

        total = len(draft_docs)
        for i, draft_doc in enumerate(draft_docs, start=1):
            pl = draft_doc.get("payload") or {}
            if pl.get("enabled") is False:
                continue

            kid_id = pl.get("kid_id", "")
            photo_keys: list[str] = pl.get("photo_keys") or []
            kid = kid_map.get(str(kid_id))
            kid_name = pl.get("kid_name") or (
                f"{kid.get('firstName', '')} {kid.get('lastName', '')}".strip() if kid else "Child"
            )

            await write_message(
                db, convo_id, role=ROLE_AGENT, kind=KIND_PROGRESS,
                content=f"Writing update for {kid_name} ({i}/{total})…",
            )

            content = voice_map.get(str(kid_id), "")

            if not content and photo_keys:
                # No voice mention — derive update from photo scenes
                scenes: list[str] = []
                for pk in photo_keys:
                    try:
                        photo_bytes = get_object(pk)
                        scene = await describe_scene(photo_bytes)
                        if scene:
                            scenes.append(scene)
                    except Exception as e:
                        log.warning("summarizer: cannot describe photo %s: %s", pk, e)
                if scenes:
                    content = await generate_photo_update(
                        kid_name=kid_name,
                        scene_description=" ".join(scenes[:2]),
                        transcript=transcript,
                    )
            elif content and photo_keys:
                # Voice content exists — enrich with photo scene if it adds context
                scenes = []
                for pk in photo_keys[:2]:
                    try:
                        photo_bytes = get_object(pk)
                        scene = await describe_scene(photo_bytes)
                        if scene:
                            scenes.append(scene)
                    except Exception:
                        pass
                if scenes:
                    content = await generate_photo_update(
                        kid_name=kid_name,
                        scene_description=" ".join(scenes),
                        transcript=transcript,
                    )

            if content:
                await db.messages.update_one(
                    {"_id": draft_doc["_id"]},
                    {"$set": {"content": content}},
                )

        await write_message(
            db, convo_id, role=ROLE_AGENT, kind=KIND_TEXT,
            content="Drafts are ready. Review and edit below, then tap \"Send to parents\" to deliver them.",
        )
        await update_conversation_status(db, convo_id, CONVO_AWAITING_REVIEW)

    except Exception as e:
        log.exception("quick_log_summarizer: failed for convo=%s", convo_id)
        await write_message(
            db, convo_id, role=ROLE_AGENT, kind=KIND_TEXT,
            content=f"Sorry — something went wrong while writing the updates: {e}",
        )
        await update_conversation_status(db, convo_id, CONVO_FAILED, error=str(e))


def register_quick_log_summarize_handler() -> None:
    job_queue.register(JOB_QUICK_LOG_SUMMARIZE, _process_quick_log_summarize)
