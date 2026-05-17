from datetime import datetime, date
from typing import Any, NewType
import strawberry

DateTime = strawberry.scalar(
    NewType("DateTime", datetime),
    description="ISO 8601 datetime string, UTC",
    serialize=lambda v: v.isoformat() if isinstance(v, datetime) else str(v),
    parse_value=lambda v: datetime.fromisoformat(v.replace("Z", "+00:00")),
)

Date = strawberry.scalar(
    NewType("Date", date),
    description="YYYY-MM-DD date string",
    serialize=lambda v: v.strftime("%Y-%m-%d") if hasattr(v, "strftime") else str(v),
    parse_value=lambda v: date.fromisoformat(v) if isinstance(v, str) else v,
)

EmailAddress = strawberry.scalar(
    NewType("EmailAddress", str),
    description="RFC 5322 email address",
    serialize=lambda v: str(v),
    parse_value=lambda v: str(v).lower().strip(),
)
