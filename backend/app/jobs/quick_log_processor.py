"""
Quick Log Phase 1: face recognition + photo grouping.

Runs face detection on each submitted photo, groups photos by kid, and
creates empty draft_card messages (no text yet). Transitions the conversation
to awaiting_photo_review so the educator can review and adjust the grouping
before Phase 2 (text summarisation) is triggered.
"""
from __future__ import annotations
import asyncio
import logging

from app.core.database import get_database
from app.core import jobs as job_queue
from app.core.storage import get_object
from app.graphql.agents import write_message, update_conversation_status
from app.models.conversation import (
    CONVO_PROCESSING, CONVO_AWAITING_PHOTO_REVIEW, CONVO_FAILED,
    KIND_TEXT, KIND_PROGRESS, KIND_DRAFT_CARD,
    ROLE_AGENT, JOB_QUICK_LOG_ANALYSIS,
)

log = logging.getLogger(__name__)


async def _process_quick_log(job: dict) -> None:
    """Phase 1 — run face recognition, group photos by kid, create empty draft cards."""
    from app.ai.face_recognizer import match_faces

    payload = job.get("payload") or {}
    convo_id: str = payload["conversation_id"]
    viewer_id: str = payload["user_id"]

    db = get_database()
    await update_conversation_status(db, convo_id, CONVO_PROCESSING)

    # Read conversation to get stored photo_keys and class_id
    convo = await db.conversations.find_one({"_id": convo_id})
    photo_keys: list[str] = convo.get("all_photo_keys") or payload.get("photo_keys") or []
    class_id = convo.get("class_id") or payload.get("class_id")

    try:
        # ── Collect eligible kids ────────────────────────────────────────
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

        log.warning(
            "quick_log_processor: found %d kids; with_embedding=%d",
            len(kids),
            sum(1 for k in kids if k.get("faceEmbedding")),
        )

        kid_map = {k["_id"]: k for k in kids}
        candidates = {k["_id"]: k["faceEmbedding"] for k in kids if k.get("faceEmbedding")}

        # ── Face recognition — group photos by kid ───────────────────────
        photo_kid_map: dict[str, list[str]] = {}  # photo_key → [kid_id, ...]

        total_photos = len(photo_keys)
        for i, pk in enumerate(photo_keys, start=1):
            await write_message(
                db, convo_id, role=ROLE_AGENT, kind=KIND_PROGRESS,
                content=f"Scanning photo {i} of {total_photos} for faces…",
            )
            try:
                photo_bytes = get_object(pk)
            except Exception as e:
                log.warning("quick_log_processor: cannot fetch photo %s: %s", pk, e)
                continue
            detected = await asyncio.to_thread(match_faces, photo_bytes, candidates)
            detected_ids = [kid_id for kid_id, _ in detected]
            photo_kid_map[pk] = detected_ids

        # ── Invert: kid → list of their photos ──────────────────────────
        kid_photo_map: dict[str, list[str]] = {}
        for pk, kid_ids in photo_kid_map.items():
            for kid_id in kid_ids:
                kid_photo_map.setdefault(kid_id, []).append(pk)

        detected_kids = set(kid_photo_map.keys())

        # ── Diagnostics if nothing was detected ──────────────────────────
        if not detected_kids and photo_keys:
            if not candidates:
                kids_with_photo = sum(1 for k in kids if k.get("profilePhotoKey"))
                if kids_with_photo == 0:
                    msg = (
                        "No children in this class have a profile photo — add profile "
                        "photos in the Classes tab so I can match faces. You can still "
                        "add children manually below."
                    )
                else:
                    msg = (
                        f"{kids_with_photo} child{'ren' if kids_with_photo != 1 else ''} "
                        "have profile photos but no face embeddings — go to Settings → "
                        "Regenerate Face Data, then try again. You can add children manually below."
                    )
            else:
                msg = (
                    "I couldn't match any faces in the photos to the children's profile photos. "
                    "You can drag photos onto the children manually below."
                )
            await write_message(db, convo_id, role=ROLE_AGENT, kind=KIND_TEXT, content=msg)

        # ── Create empty draft cards for each detected kid ───────────────
        for kid_id in detected_kids:
            kid = kid_map.get(str(kid_id))
            if not kid:
                continue
            kid_name = f"{kid.get('firstName', '')} {kid.get('lastName', '')}".strip()
            ppk = kid.get("profilePhotoKey")
            await write_message(
                db, convo_id, role=ROLE_AGENT, kind=KIND_DRAFT_CARD,
                content="",
                payload={
                    "kid_id": str(kid_id),
                    "kid_name": kid_name,
                    "avatar_key": ppk,
                    "photo_keys": kid_photo_map.get(str(kid_id), []),
                },
            )

        await write_message(
            db, convo_id, role=ROLE_AGENT, kind=KIND_TEXT,
            content=(
                "I've grouped the photos by child. Review the grouping below — "
                "drag photos to reassign, add missing children, or remove incorrect ones. "
                "Tap **Confirm & Summarise** when ready."
            ),
        )
        await update_conversation_status(db, convo_id, CONVO_AWAITING_PHOTO_REVIEW)

    except Exception as e:
        log.exception("quick_log_processor: failed for convo=%s", convo_id)
        await write_message(
            db, convo_id, role=ROLE_AGENT, kind=KIND_TEXT,
            content=f"Sorry — something went wrong while scanning photos: {e}",
        )
        await update_conversation_status(db, convo_id, CONVO_FAILED, error=str(e))


def register_quick_log_handler() -> None:
    job_queue.register(JOB_QUICK_LOG_ANALYSIS, _process_quick_log)
