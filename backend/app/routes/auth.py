from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId
from app.core.database import get_database
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import UserCreate, UserInDB, UserResponse, UserStatus

router = APIRouter()

class LoginRequest(BaseModel):
    login: str  # accepts either username or email
    password: str

class ActivateRequest(BaseModel):
    token: str
    password: str

@router.post("/register", response_model=UserResponse)
async def register_user(user_in: UserCreate):
    db = get_database()
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_in.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user_dict = user_in.model_dump()
    password = user_dict.pop("password")
    user_dict["passwordHash"] = get_password_hash(password)
    
    db_user = UserInDB(**user_dict)
    
    result = await db.users.insert_one(db_user.model_dump(by_alias=True))
    
    # Fetch created user
    created_user = await db.users.find_one({"_id": result.inserted_id})
    return UserResponse.from_mongo(created_user)

@router.post("/login")
async def login(login_req: LoginRequest):
    db = get_database()
    # Support login by username or email
    user = await db.users.find_one({
        "$or": [
            {"email": login_req.login},
            {"username": login_req.login},
        ]
    })
    
    if not user or not verify_password(login_req.password, user.get("passwordHash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
        )

    if user.get("status") == UserStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not activated. Please check your email for the activation link.",
        )
        
    access_token = create_access_token(data={"sub": str(user["_id"]), "role": user["role"]})
    return {"access_token": access_token, "token_type": "bearer", "user": UserResponse.from_mongo(user)}


@router.get("/validate-token/{token}")
async def validate_token(token: str):
    """Check if an invitation token is valid. Returns user/institution info for the activation page."""
    db = get_database()
    invitation = await db.invitations.find_one({"token": token})

    if not invitation:
        raise HTTPException(status_code=404, detail="Invalid or expired token")
    if invitation.get("used"):
        raise HTTPException(status_code=400, detail="Token has already been used")
    if invitation["expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token has expired")

    # Fetch user and institution info for display
    user = await db.users.find_one({"_id": invitation["user_id"]})
    institution = await db.institutions.find_one({"_id": invitation["institution_id"]})

    if not user or not institution:
        raise HTTPException(status_code=404, detail="Associated user or institution not found")

    return {
        "valid": True,
        "email": user.get("email"),
        "first_name": user["profile"]["firstName"],
        "last_name": user["profile"]["lastName"],
        "role": invitation["role"],
        "institution_name": institution["name"],
    }


@router.post("/activate")
async def activate_account(req: ActivateRequest):
    """Activate a pending user account by setting their password."""
    db = get_database()
    invitation = await db.invitations.find_one({"token": req.token})

    if not invitation:
        raise HTTPException(status_code=404, detail="Invalid or expired token")
    if invitation.get("used"):
        raise HTTPException(status_code=400, detail="Token has already been used")
    if invitation["expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token has expired")

    # Hash the new password and activate the user
    password_hash = get_password_hash(req.password)
    await db.users.update_one(
        {"_id": invitation["user_id"]},
        {"$set": {
            "passwordHash": password_hash,
            "status": UserStatus.active,
            "updatedAt": datetime.utcnow(),
        }}
    )

    # Mark token as used
    await db.invitations.update_one(
        {"_id": invitation["_id"]},
        {"$set": {"used": True}}
    )

    return {"success": True, "message": "Account activated successfully. You can now log in."}
