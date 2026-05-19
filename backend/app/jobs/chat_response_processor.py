"""
Job handler for free-form AI chat responses.

When a user sends a message in any conversation, this job fetches the
text-only message history, passes it to Gemini as a multi-turn chat,
and writes the response back as an agent message.
"""
from __future__ import annotations
import asyncio
import logging

from app.core.database import get_database
from app.core import jobs as job_queue
from app.graphql.agents import write_message
from app.models.conversation import (
    KIND_TEXT, ROLE_AGENT, ROLE_USER, JOB_CHAT_RESPONSE,
)

log = logging.getLogger(__name__)

_SYSTEM_PROMPT = (
    "You are a helpful AI assistant for Sprout, a daycare management platform. "
    "Help educators with activity planning, child development questions, "
    "parent communication, and general daycare operations. "
    "Be warm, concise, and practical."
)


async def _process_chat_response(job: dict) -> None:
    import google.generativeai as genai
    from app.ai.llm_service import FLASH_MODEL

    payload = job.get("payload") or {}
    convo_id: str = payload["conversation_id"]

    db = get_database()

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
        model = genai.GenerativeModel(
            FLASH_MODEL,
            system_instruction=_SYSTEM_PROMPT,
        )
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
