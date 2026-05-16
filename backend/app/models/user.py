from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, *args, **kwargs):
        return str(v)

class UserProfile(BaseModel):
    firstName: str
    lastName: str
    phone: Optional[str] = None
    avatarUrl: Optional[str] = None

class UserBase(BaseModel):
    email: EmailStr
    role: str = Field(..., pattern="^(super_admin|school_admin|teacher|parent)$")
    profile: UserProfile
    schoolId: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    passwordHash: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class UserResponse(UserBase):
    id: str

    class Config:
        populate_by_name = True
