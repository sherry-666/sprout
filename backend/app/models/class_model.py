from typing import Optional, List, Any
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from app.models.user import PyObjectId

class ClassBase(BaseModel):
    name: str
    institution_id: PyObjectId
    educator_user_ids: List[PyObjectId] = []
    kid_ids: List[PyObjectId] = []

class ClassCreate(ClassBase):
    pass

class ClassInDB(ClassBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class ClassResponse(ClassBase):
    id: str

    class Config:
        populate_by_name = True
