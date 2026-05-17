from fastapi import APIRouter, HTTPException, Depends
from app.core.database import get_database
from app.core.deps import get_current_user

router = APIRouter()


@router.get("/kids")
async def get_my_kids(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "parent":
        raise HTTPException(status_code=403, detail="Parent access required")

    db = get_database()
    user_id = str(current_user["_id"])

    kids = await db.kids.find({"parent_user_ids": user_id}).to_list(length=100)

    result = []
    for k in kids:
        institution = None
        if k.get("institution_id"):
            inst_doc = await db.institutions.find_one({"_id": k["institution_id"]})
            if inst_doc:
                institution = {"id": str(inst_doc["_id"]), "name": inst_doc["name"]}

        class_info = None
        educators = []
        if k.get("class_id"):
            class_doc = await db.classes.find_one({"_id": str(k["class_id"])})
            if class_doc:
                class_info = {"id": str(class_doc["_id"]), "name": class_doc["name"]}
                for edu_id in class_doc.get("educator_user_ids", []):
                    edu = await db.users.find_one({"_id": edu_id})
                    if edu:
                        educators.append({
                            "id": str(edu["_id"]),
                            "name": f"{edu['profile']['firstName']} {edu['profile']['lastName']}",
                        })

        result.append({
            "id": str(k["_id"]),
            "firstName": k["firstName"],
            "lastName": k["lastName"],
            "gender": k.get("gender"),
            "dateOfBirth": k["dateOfBirth"].isoformat() if k.get("dateOfBirth") else None,
            "profilePhotoUrl": k.get("profilePhotoUrl"),
            "institution": institution,
            "class": class_info,
            "educators": educators,
        })

    return result
