from __future__ import annotations
from typing import Optional, List
import strawberry
from app.graphql.scalars import EmailAddress
from app.graphql.enums import UserRole, Gender


@strawberry.input
class ProfileInput:
    first_name: str
    last_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


@strawberry.input
class LoginInput:
    login: str
    password: str


@strawberry.input
class ActivateInput:
    token: str
    password: str


@strawberry.input
class RegisterUserInput:
    email: EmailAddress
    password: str
    role: UserRole
    profile: ProfileInput
    institution_id: Optional[strawberry.ID] = None


@strawberry.input
class CreateInstitutionInput:
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    admin_email: Optional[EmailAddress] = None
    admin_first_name: Optional[str] = None
    admin_last_name: Optional[str] = None


@strawberry.input
class InviteEducatorInput:
    first_name: str
    last_name: str
    email: EmailAddress


@strawberry.input
class ParentInput:
    first_name: str
    last_name: str
    email: EmailAddress
    phone: Optional[str] = None


@strawberry.input
class RegisterKidInput:
    first_name: str
    last_name: str
    gender: Gender
    date_of_birth: str  # YYYY-MM-DD
    profile_photo_url: Optional[str] = None
    parents: List[ParentInput] = strawberry.field(default_factory=list)


@strawberry.input
class CreateClassInput:
    name: str


@strawberry.input
class AssignClassInput:
    class_id: strawberry.ID
    educator_ids: Optional[List[strawberry.ID]] = None
    kid_ids: Optional[List[strawberry.ID]] = None


@strawberry.input
class CreateUpdateInput:
    class_id: strawberry.ID
    type: str
    content: str
    kid_id: Optional[strawberry.ID] = None
    media_urls: Optional[List[str]] = None
