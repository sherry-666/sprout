from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime

from app.models.user import PyObjectId


class CalendarProvider(str, Enum):
    google = "google"
    microsoft = "microsoft"
    apple = "apple"


class CalendarIntegrationInDB(BaseModel):
    id: str = Field(default_factory=lambda: __import__('uuid').uuid4().__str__(), alias="_id")
    user_id: str
    provider: CalendarProvider
    provider_account_email: str = ""
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_at: Optional[datetime] = None
    scopes: List[str] = []
    last_synced_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class CalendarEventInDB(BaseModel):
    id: str = Field(default_factory=lambda: __import__('uuid').uuid4().__str__(), alias="_id")
    user_id: str
    integration_id: str
    provider: CalendarProvider
    provider_event_id: str
    title: str
    start: datetime
    end: datetime
    all_day: bool = False
    location: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
