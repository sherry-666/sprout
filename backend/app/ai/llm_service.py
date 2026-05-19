"""
Gemini client + backward-compatible model wrapper.

Uses the new google-genai SDK (v1 endpoint), but exposes a small proxy
object whose .generate_content() / .start_chat() methods match the old
google-generativeai surface so callers don't need to change.
"""
from __future__ import annotations
from typing import Any, Optional

from google import genai
from google.genai import types

from app.core.config import settings


FLASH_MODEL = "gemini-2.5-flash"
PRO_MODEL = "gemini-2.5-flash"

_client = genai.Client(api_key=settings.GEMINI_API_KEY)


class _ChatProxy:
    """Mimics the old `chat.send_message(text)` API."""

    def __init__(self, chat: Any):
        self._chat = chat

    def send_message(self, text: str):
        return self._chat.send_message(text)


class _ModelProxy:
    """
    Mimics the old `model.generate_content(...)` and `model.start_chat(...)`
    API so existing callers (voice_parser, chat_response_processor) work
    without changes.
    """

    def __init__(self, model_name: str, system_instruction: Optional[str] = None):
        self._model = model_name
        self._system = system_instruction

    def _config(self):
        if self._system:
            return types.GenerateContentConfig(system_instruction=self._system)
        return None

    def generate_content(self, contents):
        # The old SDK accepted dict-with-inline_data as a content item;
        # the new SDK accepts dicts too, so pass through.
        return _client.models.generate_content(
            model=self._model,
            contents=contents,
            config=self._config(),
        )

    def start_chat(self, history=None):
        chat = _client.chats.create(
            model=self._model,
            history=history or [],
            config=self._config(),
        )
        return _ChatProxy(chat)


def get_flash_model(system_instruction: Optional[str] = None) -> _ModelProxy:
    return _ModelProxy(FLASH_MODEL, system_instruction=system_instruction)


def get_pro_model(system_instruction: Optional[str] = None) -> _ModelProxy:
    return _ModelProxy(PRO_MODEL, system_instruction=system_instruction)


# ── High-level helpers preserved for backward compatibility ─────────────

async def draft_parent_update(kid_name: str, activity_tags: str) -> str:
    prompt = f"""
    You are an AI assistant helping a daycare teacher write updates for parents.
    Write a short, warm, and professional 1-2 sentence update for a parent about their child, {kid_name}.
    Use the following activity tags to form the update: {activity_tags}

    Make it sound human, encouraging, and natural. Do not use emojis unless appropriate.
    """
    response = get_flash_model().generate_content(prompt)
    return response.text.strip()


async def summarize_photo(image_path: str, kid_name: str) -> str:
    import PIL.Image
    try:
        img = PIL.Image.open(image_path)
    except Exception as e:
        return f"Could not process photo: {str(e)}"
    prompt = f"Briefly describe what the child ({kid_name}) is doing in this photo. Keep it to 1 sentence suitable for a daycare update."
    response = get_flash_model().generate_content([prompt, img])
    return response.text.strip()


async def generate_daily_summary(kid_name: str, updates_text: list[str]) -> str:
    updates_combined = "\n- ".join(updates_text)
    prompt = f"""
    You are an AI assistant helping a daycare center generate daily summaries.
    Write a cohesive, warm paragraph summarizing {kid_name}'s day based on these logged updates:

    - {updates_combined}

    The summary should flow well and give the parent a good overview of their child's day.
    """
    response = get_flash_model().generate_content(prompt)
    return response.text.strip()
