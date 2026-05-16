from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from app.core.database import get_database
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import UserCreate, UserInDB, UserResponse

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
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
    return UserResponse(**created_user)

@router.post("/login")
async def login(login_req: LoginRequest):
    db = get_database()
    user = await db.users.find_one({"email": login_req.email})
    
    if not user or not verify_password(login_req.password, user["passwordHash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
        
    access_token = create_access_token(data={"sub": str(user["_id"]), "role": user["role"]})
    return {"access_token": access_token, "token_type": "bearer", "user": UserResponse(**user)}
