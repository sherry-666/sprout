from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from app.models.user import PyObjectId

class UpdateBase(BaseModel):
    kidId: Optional[str] = None # Optional if it's a group update (multiple detectedKidIds)
    teacherId: str
    classId: str
    type: str = Field(..., pattern="^(meal|nap|activity|photo|daily_summary)$")
    content: str
    aiGeneratedContent: Optional[str] = None
    mediaUrls: List[str] = []
    detectedKidIds: List[str] = []

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
