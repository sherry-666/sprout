"""
Voice log processing via Gemini:
  transcribe_audio  — raw audio bytes → plain transcript string
  parse_transcript  — transcript + kid list → per-kid update dicts
  describe_scene    — image bytes → one-sentence scene description
"""
from __future__ import annotations
import base64
import io
import json
import logging
import re

log = logging.getLogger(__name__)


async def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/m4a") -> str:
    """Send audio bytes to Gemini and return the raw transcript."""
    from app.ai.llm_service import get_flash_model
    b64 = base64.b64encode(audio_bytes).decode()
    model = get_flash_model()
    response = model.generate_content([
        {"inline_data": {"mime_type": mime_type, "data": b64}},
        "Transcribe this audio recording exactly as spoken. Return only the transcript text, nothing else.",
    ])
    return response.text.strip()


async def parse_transcript(
    transcript: str,
    kids: list[dict],  # [{"id": str, "name": str}]
) -> list[dict]:  # [{"kid_id": str, "kid_name": str, "content": str}]
    """
    Use Gemini to identify which kids are mentioned in the transcript and
    generate a warm, parent-friendly 1–2 sentence update for each.
    Returns an empty list if the transcript is blank or no kids are identified.
    """
    if not transcript.strip() or not kids:
        return []

    kids_json = json.dumps([{"id": k["id"], "name": k["name"]} for k in kids])
    from app.ai.llm_service import get_flash_model
    model = get_flash_model()

    prompt = f"""You are helping a daycare educator write parent updates.

Kids in scope: {kids_json}

Teacher's voice note: "{transcript}"

Rules:
- Identify every kid mentioned (by name, nickname, or group reference like "the boys" / "everyone").
- If the teacher describes a whole-class activity without naming anyone, include ALL kids.
- For each identified kid write a warm, parent-friendly 1–2 sentence update.
- Use the exact "id" values from the list above.

Return ONLY a JSON array — no markdown, no explanation:
[{{"kid_id":"<id>","kid_name":"<name>","content":"<update>"}}]"""

    response = model.generate_content(prompt)
    text = response.text.strip()
    match = re.search(r'\[.*\]', text, re.DOTALL)
    if not match:
        log.warning("parse_transcript: no JSON array found in response: %s", text[:300])
        return []
    try:
        return json.loads(match.group())
    except json.JSONDecodeError:
        log.warning("parse_transcript: JSON decode error: %s", text[:300])
        return []


async def identify_kids_in_photo(
    photo_bytes: bytes,
    kid_profiles: list[dict],  # [{"id": str, "name": str, "bytes": bytes}]
) -> list[str]:
    """
    Use Gemini Vision to identify which enrolled kids appear in a group photo
    by comparing faces against their stored profile photos.
    Returns a list of matched kid IDs.
    """
    if not kid_profiles:
        return []
    try:
        import PIL.Image
        from app.ai.llm_service import get_flash_model
        group_img = PIL.Image.open(io.BytesIO(photo_bytes))
        parts: list = [
            "This is a group photo taken at a daycare:",
            group_img,
            "\nBelow are profile photos of the children enrolled in this class:",
        ]
        name_to_id: dict[str, str] = {}
        for kid in kid_profiles:
            name = kid["name"]
            parts.append(f"\n{name}:")
            parts.append(PIL.Image.open(io.BytesIO(kid["bytes"])))
            name_to_id[name] = kid["id"]

        parts.append(
            "\nBased on facial appearance, which of these children are visible in the group photo? "
            "Return ONLY a JSON array of their full names, e.g. [\"Alice Smith\"]. "
            "Only include confident matches. Return [] if none can be recognised."
        )
        model = get_flash_model()
        response = model.generate_content(parts)
        m = re.search(r'\[.*?\]', response.text.strip(), re.DOTALL)
        if not m:
            return []
        matched = json.loads(m.group())
        return [name_to_id[n] for n in matched if n in name_to_id]
    except Exception as e:
        log.warning("identify_kids_in_photo failed: %s", e)
        return []


async def generate_photo_update(
    kid_name: str,
    scene_description: str,
    transcript: str = "",
) -> str:
    """Generate a warm, parent-friendly update based on a photo scene."""
    from app.ai.llm_service import get_flash_model
    extra = f'\nTeacher note: "{transcript}"' if transcript else ""
    prompt = (
        f"Write a warm, parent-friendly 1–2 sentence update for {kid_name}'s parents "
        f"describing what their child was doing at daycare.\n"
        f"Photo scene: {scene_description}{extra}\n"
        "Write only the update text. Be specific, warm, and encouraging."
    )
    try:
        model = get_flash_model()
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        log.warning("generate_photo_update failed: %s", e)
        return scene_description


async def describe_scene(image_bytes: bytes) -> str:
    """Use Gemini Vision to describe what's happening in a daycare photo (1–2 sentences)."""
    try:
        import PIL.Image
        from app.ai.llm_service import get_flash_model
        img = PIL.Image.open(io.BytesIO(image_bytes))
        model = get_flash_model()
        response = model.generate_content([
            "Briefly describe what is happening in this daycare photo in 1–2 warm sentences. "
            "Focus on visible activities and interactions.",
            img,
        ])
        return response.text.strip()
    except Exception as e:
        log.warning("describe_scene failed: %s", e)
        return ""
