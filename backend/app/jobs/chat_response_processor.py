"""
Job handler for free-form AI chat responses.

When a user sends a message in any conversation, this job fetches the
text-only message history, passes it to Gemini as a multi-turn chat,
and writes the response back as an agent message.
"""
from __future__ import annotations
import asyncio
import logging
from datetime import date, datetime

from app.core.database import get_database
from app.core import jobs as job_queue
from app.graphql.agents import write_message
from app.models.conversation import (
    KIND_TEXT, ROLE_AGENT, ROLE_USER, JOB_CHAT_RESPONSE,
)

log = logging.getLogger(__name__)

_BASE_PROMPT = (
    "You are a helpful AI assistant for Sprout, a daycare management platform. "
    "Help educators with activity planning, child development questions, "
    "parent communication, and general daycare operations. "
    "Be warm, concise, and practical."
)


def _age_from_dob(dob) -> str:
    """Return a human-readable age string from a dateOfBirth value (str or date)."""
    try:
        if isinstance(dob, str):
            dob = date.fromisoformat(dob[:10])
        elif isinstance(dob, datetime):
            dob = dob.date()
        today = date.today()
        months = (today.year - dob.year) * 12 + (today.month - dob.month)
        if months < 24:
            return f"{months}mo"
        return f"{months // 12}y"
    except Exception:
        return ""


async def _build_system_prompt(db, user_id: str) -> str:
    """Append the educator's class and kid roster to the base system prompt."""
    try:
        classes = await db.classes.find(
            {"educator_user_ids": user_id}
        ).to_list(20)
        if not classes:
            return _BASE_PROMPT

        sections: list[str] = []
        for cls in classes:
            kid_ids = cls.get("kid_ids") or []
            if not kid_ids:
                continue
            kids = await db.kids.find({"_id": {"$in": kid_ids}}).to_list(100)
            kid_lines: list[str] = []
            for k in kids:
                name = f"{k.get('firstName', '')} {k.get('lastName', '')}".strip()
                age = _age_from_dob(k.get("dateOfBirth"))
                gender = k.get("gender") or ""
                parts = [p for p in [age, gender] if p]
                detail = f" ({', '.join(parts)})" if parts else ""
                kid_lines.append(f"  - {name}{detail}")
            if kid_lines:
                sections.append(f"Class: {cls.get('name', 'Unnamed')}\n" + "\n".join(kid_lines))

        if not sections:
            return _BASE_PROMPT

        roster = "\n\n".join(sections)
        return (
            f"{_BASE_PROMPT}\n\n"
            "The educator you are helping teaches the following classes and children:\n\n"
            f"{roster}\n\n"
            "Use this information to personalise advice — mention kids by name when relevant "
            "and tailor activity or development suggestions to their ages."
        )
    except Exception:
        log.exception("chat_response_processor: failed to build context prompt for user=%s", user_id)
        return _BASE_PROMPT


async def _process_chat_response(job: dict) -> None:
    from app.ai.llm_service import get_flash_model

    payload = job.get("payload") or {}
    convo_id: str = payload["conversation_id"]
    user_id: str = payload.get("user_id", "")

    db = get_database()

    system_prompt = await _build_system_prompt(db, user_id)

    # Fetch only text messages — skip progress/draft_card/action noise
    docs = await db.messages.find(
        {"conversation_id": convo_id, "kind": KIND_TEXT}
    ).sort("created_at", 1).to_list(40)

    if not docs:
        return

    # Build Gemini multi-turn history (user↔model pairs only)
    history = [
        {
            "role": "user" if d.get("role") == ROLE_USER else "model",
            "parts": [{"text": d.get("content", "")}],
        }
        for d in docs
    ]

    # Gemini requires history to start with a 'user' turn — drop any leading
    # model messages (e.g. the greeting written when the conversation is created)
    while history and history[0]["role"] == "model":
        history.pop(0)

    if not history:
        return

    last_text = history[-1]["parts"][0]["text"]
    prior_history = history[:-1]

    try:
        model = get_flash_model(system_instruction=system_prompt)
        chat = model.start_chat(history=prior_history)
        response = await asyncio.to_thread(chat.send_message, last_text)
        reply = response.text.strip()
    except Exception as e:
        log.exception("chat_response_processor: gemini error for convo=%s: %s", convo_id, e)
        reply = f"Sorry, something went wrong: {e}"

    await write_message(db, convo_id, role=ROLE_AGENT, kind=KIND_TEXT, content=reply)


def register_chat_handler() -> None:
    """Wire the processor into the job queue. Called once at app startup."""
    job_queue.register(JOB_CHAT_RESPONSE, _process_chat_response)
