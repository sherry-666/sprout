from typing import Optional, List, Any
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from app.models.user import PyObjectId

class KidBase(BaseModel):
    firstName: str
    lastName: str
    gender: Optional[str] = None  # 'male' | 'female'
    dateOfBirth: Optional[datetime] = None
    parent_user_ids: List[str] = []
    class_id: Optional[PyObjectId] = None
    institution_id: Optional[PyObjectId] = None
    profilePhotoKey: Optional[str] = None

class KidCreate(KidBase):
    pass

class KidInDB(KidBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    faceEmbedding: Optional[bytes] = None  # Binary 128-d vector
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class KidResponse(KidBase):
    id: str

    class Config:
        populate_by_name = True
