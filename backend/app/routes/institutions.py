import secrets
from datetime import datetime

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from bson import ObjectId
from app.core.database import get_database
from app.core.email_service import send_activation_email, is_whitelisted
from app.models.institution import InstitutionCreate, InstitutionInDB, InstitutionResponse
from app.models.invitation import InvitationToken
from app.models.user import UserInDB, UserProfile, UserRole, UserStatus

router = APIRouter()


class InstitutionCreateRequest(InstitutionCreate):
    """Extends InstitutionCreate with optional admin info for invitation."""
    admin_email: Optional[EmailStr] = None
    admin_first_name: Optional[str] = None
    admin_last_name: Optional[str] = None


@router.get("", response_model=List[dict])
async def list_institutions():
    """List all institutions with their admin user and stats."""
    db = get_database()
    institutions = await db.institutions.find().to_list(length=100)

    results = []
    for inst in institutions:
        inst_data = InstitutionResponse.from_mongo(inst).model_dump()

        # Find admin by querying users with role=admin and institutionId
        admin_doc = await db.users.find_one({
            "role": UserRole.admin,
            "institution_id": inst_data["id"]
        })
        inst_data["adminInfo"] = {
            "id": str(admin_doc["_id"]),
            "name": f"{admin_doc['profile']['firstName']} {admin_doc['profile']['lastName']}",
            "email": admin_doc.get("email") or admin_doc.get("username"),
            "status": admin_doc.get("status", "active"),
        } if admin_doc else None

        inst_data["kidCount"] = await db.kids.count_documents({"institution_id": inst_data["id"]})
        inst_data["classCount"] = await db.classes.count_documents({"institution_id": inst_data["id"]})
        results.append(inst_data)

    return results


@router.post("", response_model=dict)
async def create_institution(req: InstitutionCreateRequest):
    """Create a new institution and optionally invite an admin via email."""
    db = get_database()

    # 1. Create institution
    inst_data = InstitutionCreate(
        name=req.name,
        address=req.address,
        city=req.city,
        province=req.province,
        phone=req.phone,
        email=req.email,
        status=req.status,
    )
    inst = InstitutionInDB(**inst_data.model_dump())
    result = await db.institutions.insert_one(inst.model_dump(by_alias=True))
    created_inst = await db.institutions.find_one({"_id": result.inserted_id})
    inst_response = InstitutionResponse.from_mongo(created_inst).model_dump()

    # 2. If admin info provided, create pending user + send invitation email
    if req.admin_email and req.admin_first_name and req.admin_last_name:
        # Whitelist check
        if not is_whitelisted(req.admin_email):
            raise HTTPException(
                status_code=400,
                detail=f"Email {req.admin_email} is not in the dev whitelist."
            )

        # Check if email already exists
        existing = await db.users.find_one({"email": req.admin_email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Create pending user (no password)
        pending_user = UserInDB(
            email=req.admin_email,
            role=UserRole.admin,
            profile=UserProfile(
                firstName=req.admin_first_name,
                lastName=req.admin_last_name,
            ),
            institution_id=result.inserted_id,
            status=UserStatus.pending,
        )
        user_result = await db.users.insert_one(
            pending_user.model_dump(by_alias=True)
        )

        # Generate invitation token
        token = secrets.token_urlsafe(32)
        invitation = InvitationToken(
            token=token,
            user_id=user_result.inserted_id,
            institution_id=result.inserted_id,
            role=UserRole.admin,
        )
        await db.invitations.insert_one(invitation.model_dump())

        # Send activation email
        try:
            send_activation_email(
                to_email=req.admin_email,
                token=token,
                institution_name=req.name,
                first_name=req.admin_first_name,
                role="admin",
            )
            inst_response["invitation_sent"] = True
        except Exception as e:
            inst_response["invitation_sent"] = False
            inst_response["invitation_error"] = str(e)

    return inst_response


@router.get("/{institution_id}", response_model=dict)
async def get_institution(institution_id: str):
    """Get a single institution with full details."""
    db = get_database()
    try:
        inst = await db.institutions.find_one({"_id": ObjectId(institution_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid institution ID")
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    inst_data = InstitutionResponse.from_mongo(inst).model_dump()

    admin_doc = await db.users.find_one({
        "role": UserRole.admin,
        "institution_id": institution_id
    })
    inst_data["adminInfo"] = {
        "id": str(admin_doc["_id"]),
        "name": f"{admin_doc['profile']['firstName']} {admin_doc['profile']['lastName']}",
        "email": admin_doc.get("email") or admin_doc.get("username"),
    } if admin_doc else None

    inst_data["kidCount"] = await db.kids.count_documents({"institution_id": institution_id})
    inst_data["classCount"] = await db.classes.count_documents({"institution_id": institution_id})
    inst_data["educatorCount"] = await db.users.count_documents({"role": UserRole.educator, "institution_id": institution_id})
    return inst_data
