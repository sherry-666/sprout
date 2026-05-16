from typing import Optional, List, Any
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from app.models.user import PyObjectId

class UpdateBase(BaseModel):
    kid_id: Optional[PyObjectId] = None           # Optional: null = group update
    educator_user_id: PyObjectId
    class_id: PyObjectId
    type: str = Field(..., pattern="^(meal|nap|activity|photo|daily_summary)$")
    content: str
    aiGeneratedContent: Optional[str] = None
    mediaUrls: List[str] = []
    detected_kid_ids: List[PyObjectId] = []

class UpdateCreate(UpdateBase):
    pass

class UpdateInDB(UpdateBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class UpdateResponse(UpdateBase):
    id: str
    timestamp: datetime

    class Config:
        populate_by_name = True
