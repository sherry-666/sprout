from fastapi import APIRouter, HTTPException
from typing import List
from bson import ObjectId
from app.core.database import get_database
from app.models.institution import InstitutionCreate, InstitutionInDB, InstitutionResponse

router = APIRouter()

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
            "role": "admin",
            "institution_id": inst_data["id"]
        })
        inst_data["adminInfo"] = {
            "id": str(admin_doc["_id"]),
            "name": f"{admin_doc['profile']['firstName']} {admin_doc['profile']['lastName']}",
            "email": admin_doc.get("email") or admin_doc.get("username"),
        } if admin_doc else None

        inst_data["kidCount"] = await db.kids.count_documents({"institution_id": inst_data["id"]})
        inst_data["classCount"] = await db.classes.count_documents({"institution_id": inst_data["id"]})
        results.append(inst_data)

    return results

@router.post("", response_model=InstitutionResponse)
async def create_institution(inst_in: InstitutionCreate):
    """Create a new institution (super_admin only)."""
    db = get_database()
    inst = InstitutionInDB(**inst_in.model_dump())
    result = await db.institutions.insert_one(inst.model_dump(by_alias=True))
    created = await db.institutions.find_one({"_id": result.inserted_id})
    return InstitutionResponse.from_mongo(created)

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
        "role": "admin",
        "institution_id": institution_id
    })
    inst_data["adminInfo"] = {
        "id": str(admin_doc["_id"]),
        "name": f"{admin_doc['profile']['firstName']} {admin_doc['profile']['lastName']}",
        "email": admin_doc.get("email") or admin_doc.get("username"),
    } if admin_doc else None

    inst_data["kidCount"] = await db.kids.count_documents({"institution_id": institution_id})
    inst_data["classCount"] = await db.classes.count_documents({"institution_id": institution_id})
    inst_data["educatorCount"] = await db.users.count_documents({"role": "educator", "institution_id": institution_id})
    return inst_data
