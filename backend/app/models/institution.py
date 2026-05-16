from typing import Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from app.models.user import PyObjectId

class InstitutionBase(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: str = Field(default="active", pattern="^(active|inactive)$")

class InstitutionCreate(InstitutionBase):
    pass

class InstitutionInDB(InstitutionBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class InstitutionResponse(InstitutionBase):
    id: str
    createdAt: datetime

    class Config:
        populate_by_name = True

    @classmethod
    def from_mongo(cls, data: dict):
        data = dict(data)
        data["id"] = str(data.get("_id", ""))
        return cls(**data)
