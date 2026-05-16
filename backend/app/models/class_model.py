from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from app.models.user import PyObjectId

class ClassBase(BaseModel):
    name: str
    schoolId: str
    teachers: List[str] = [] # List of teacher User IDs
    kids: List[str] = [] # List of Kid IDs

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
