import secrets
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from app.core.database import get_database
from app.core.deps import require_admin
from app.core.email import send_educator_invite, is_whitelisted
from app.models.invitation import InvitationToken
from app.models.user import UserInDB, UserProfile, UserRole, UserStatus

router = APIRouter()


class InviteUserRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr


@router.post("/invite")
async def invite_user(req: InviteUserRequest, current_user: dict = Depends(require_admin)):
    db = get_database()
    institution_id = current_user.get("institution_id")
    if not institution_id:
        raise HTTPException(status_code=400, detail="Admin has no associated institution")

    if not is_whitelisted(req.email):
        raise HTTPException(status_code=400, detail=f"Email {req.email} is not in the dev whitelist.")

    existing = await db.users.find_one({"email": req.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    institution = await db.institutions.find_one({"_id": institution_id})
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")

    pending_user = UserInDB(
        email=req.email,
        role=UserRole.educator,
        profile=UserProfile(firstName=req.first_name, lastName=req.last_name),
        institution_id=institution_id,
        status=UserStatus.pending,
    )
    user_result = await db.users.insert_one(pending_user.model_dump(by_alias=True))

    token = secrets.token_urlsafe(32)
    invitation = InvitationToken(
        token=token,
        user_id=user_result.inserted_id,
        institution_id=institution_id,
        role=UserRole.educator,
    )
    await db.invitations.insert_one(invitation.model_dump())

    invited_by = f"{current_user['profile']['firstName']} {current_user['profile']['lastName']}"
    send_educator_invite(
        to_email=req.email,
        token=token,
        institution_name=institution["name"],
        first_name=req.first_name,
        invited_by=invited_by,
    )

    return {"success": True, "email": req.email}


@router.get("/users")
async def list_users(current_user: dict = Depends(require_admin)):
    db = get_database()
    institution_id = current_user.get("institution_id")

    users = await db.users.find({
        "institution_id": institution_id,
        "role": {"$in": [UserRole.educator, UserRole.parent]},
    }).to_list(length=200)

    return [
        {
            "id": str(u["_id"]),
            "firstName": u["profile"]["firstName"],
            "lastName": u["profile"]["lastName"],
            "email": u.get("email") or u.get("username"),
            "role": u["role"],
            "status": u.get("status", "active"),
        }
        for u in users
    ]
