from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from app.models.user import PyObjectId

class KidBase(BaseModel):
    firstName: str
    lastName: str
    dateOfBirth: Optional[datetime] = None
    parents: List[str] = [] # List of parent User IDs
    classId: Optional[str] = None
    profilePhotoUrl: Optional[str] = None

class KidCreate(KidBase):
    pass

class KidInDB(KidBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    faceEmbedding: Optional[bytes] = None # Binary 128-d vector
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class KidResponse(KidBase):
    id: str

    class Config:
        populate_by_name = True
