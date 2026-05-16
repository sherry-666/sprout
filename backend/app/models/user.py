from typing import Optional, List, Any
from enum import Enum
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from bson import ObjectId

from pydantic_core import core_schema


class UserRole(str, Enum):
    super_admin = "super_admin"
    admin = "admin"
    educator = "educator"
    parent = "parent"


class UserStatus(str, Enum):
    active = "active"
    pending = "pending"


class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: Any, handler: Any
    ) -> core_schema.CoreSchema:
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.chain_schema([
                    core_schema.str_schema(),
                    core_schema.no_info_plain_validator_function(cls.validate),
                ])
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

class UserProfile(BaseModel):
    firstName: str
    lastName: str
    phone: Optional[str] = None
    avatarUrl: Optional[str] = None

class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    role: UserRole
    profile: UserProfile
    institution_id: Optional[PyObjectId] = None  # FK → institutions._id (null for super_admin)
    status: UserStatus = UserStatus.active

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    passwordHash: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class UserResponse(UserBase):
    id: str = Field(alias="_id")

    class Config:
        populate_by_name = True

    @classmethod
    def from_mongo(cls, data: dict):
        data = dict(data)
        data["id"] = str(data.get("_id", ""))
        return cls(**data)
