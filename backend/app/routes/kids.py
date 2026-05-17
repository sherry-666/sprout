import secrets
import logging
from datetime import datetime
from typing import Optional, List, Literal

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr

from app.core.database import get_database
from app.core.deps import require_admin
from app.core.email import send_parent_invite, is_whitelisted
from app.models.invitation import InvitationToken
from app.models.kid import KidInDB
from app.models.user import UserInDB, UserProfile, UserRole, UserStatus

router = APIRouter()
logger = logging.getLogger(__name__)


class ParentInput(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    phone: Optional[str] = None


class RegisterKidRequest(BaseModel):
    firstName: str
    lastName: str
    gender: Literal['male', 'female']
    dateOfBirth: str  # ISO date string: YYYY-MM-DD
    profilePhotoUrl: Optional[str] = None
    parents: List[ParentInput]


@router.post("/register")
async def register_kid(req: RegisterKidRequest, current_user: dict = Depends(require_admin)):
    if not req.parents:
        raise HTTPException(status_code=400, detail="At least one parent is required")

    db = get_database()
    institution_id = current_user.get("institution_id")

    institution = await db.institutions.find_one({"_id": institution_id})
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")

    parent_user_ids: List[str] = []
    emails_invited: List[str] = []

    for parent in req.parents:
        existing = await db.users.find_one({"email": parent.email})
        if existing:
            # Parent already on platform — link them, skip email
            parent_user_ids.append(str(existing["_id"]))
            continue

        # New parent — create pending account
        pending = UserInDB(
            email=parent.email,
            role=UserRole.parent,
            profile=UserProfile(
                firstName=parent.firstName,
                lastName=parent.lastName,
                phone=parent.phone,
            ),
            institution_id=institution_id,
            status=UserStatus.pending,
        )
        user_result = await db.users.insert_one(pending.model_dump(by_alias=True))
        new_id = str(user_result.inserted_id)
        parent_user_ids.append(new_id)

        # Generate invitation token
        token = secrets.token_urlsafe(32)
        invitation = InvitationToken(
            token=token,
            user_id=user_result.inserted_id,
            institution_id=institution_id,
            role=UserRole.parent,
        )
        await db.invitations.insert_one(invitation.model_dump())

        # Send email (best-effort — don't fail registration if email fails)
        try:
            if is_whitelisted(parent.email):
                send_parent_invite(
                    to_email=parent.email,
                    token=token,
                    institution_name=institution["name"],
                    first_name=parent.firstName,
                    kid_name=f"{req.firstName} {req.lastName}",
                )
                emails_invited.append(parent.email)
            else:
                logger.warning("Parent email %s not whitelisted — skipping email", parent.email)
        except Exception as e:
            logger.error("Failed to send parent invite to %s: %s", parent.email, e)

    # Parse date of birth
    try:
        dob = datetime.strptime(req.dateOfBirth, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid dateOfBirth format. Use YYYY-MM-DD.")

    kid = KidInDB(
        firstName=req.firstName,
        lastName=req.lastName,
        gender=req.gender,
        dateOfBirth=dob,
        parent_user_ids=parent_user_ids,
        institution_id=institution_id,
        profilePhotoUrl=req.profilePhotoUrl,
    )
    result = await db.kids.insert_one(kid.model_dump(by_alias=True))

    return {
        "success": True,
        "kid_id": str(result.inserted_id),
        "emails_invited": emails_invited,
    }


@router.get("")
async def list_kids(current_user: dict = Depends(require_admin)):
    db = get_database()
    institution_id = current_user.get("institution_id")
    kids = await db.kids.find({"institution_id": institution_id}).to_list(length=500)
    return [
        {
            "id": str(k["_id"]),
            "firstName": k["firstName"],
            "lastName": k["lastName"],
            "gender": k.get("gender"),
            "dateOfBirth": k["dateOfBirth"].isoformat() if k.get("dateOfBirth") else None,
            "profilePhotoUrl": k.get("profilePhotoUrl"),
            "parentCount": len(k.get("parent_user_ids", [])),
        }
        for k in kids
    ]
