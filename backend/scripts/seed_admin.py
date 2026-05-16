import asyncio
import argparse
import sys
from motor.motor_asyncio import AsyncIOMotorClient

# Make sure we can import from app
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import UserInDB

async def seed_super_admin(username: str, password: str, first_name: str, last_name: str, email: str = None):
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    existing_user = await db.users.find_one({"username": username})
    if existing_user:
        print(f"User with username '{username}' already exists!")
        return

    password_hash = get_password_hash(password)
    
    user = UserInDB(
        username=username,
        email=email,
        role="super_admin",
        passwordHash=password_hash,
        profile={
            "firstName": first_name,
            "lastName": last_name
        }
    )
    
    result = await db.users.insert_one(user.model_dump(by_alias=True))
    print(f"Successfully created super_admin '{username}' with ID: {result.inserted_id}")
    client.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed a super_admin user")
    parser.add_argument("--username", required=True, help="Admin username")
    parser.add_argument("--password", required=True, help="Admin password")
    parser.add_argument("--email", default=None, help="Admin email (optional)")
    parser.add_argument("--first-name", default="System", help="Admin first name")
    parser.add_argument("--last-name", default="Admin", help="Admin last name")
    
    args = parser.parse_args()
    
    asyncio.run(seed_super_admin(args.username, args.password, args.first_name, args.last_name, args.email))
