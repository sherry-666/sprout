from __future__ import annotations
import base64
from datetime import datetime
from typing import Optional
import strawberry


@strawberry.type
class PageInfo:
    has_next_page: bool
    has_previous_page: bool
    start_cursor: Optional[str] = None
    end_cursor: Optional[str] = None


def encode_cursor(created_at: datetime, doc_id: str) -> str:
    raw = f"{created_at.isoformat()}|{doc_id}"
    return base64.b64encode(raw.encode()).decode()


def decode_cursor(cursor: str) -> tuple[str, str]:
    """Returns (created_at_iso, doc_id)."""
    raw = base64.b64decode(cursor.encode()).decode()
    created_at_iso, doc_id = raw.split("|", 1)
    return created_at_iso, doc_id
