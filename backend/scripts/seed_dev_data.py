"""
DEV ONLY seed script — inserts dummy day care data into sprout_dev database.
NEVER run this against sprout_prod.

Usage:
    python scripts/seed_dev_data.py

Or with Railway CLI (make sure DATABASE_NAME=sprout_dev):
    railway run python scripts/seed_dev_data.py
"""

import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.institution import InstitutionInDB
from app.models.user import UserInDB

# ─── Safety guard ────────────────────────────────────────────────────────────
ALLOWED_DB_NAMES = {"sprout_dev", "sprout_test"}

def abort_if_prod():
    if settings.DATABASE_NAME not in ALLOWED_DB_NAMES:
        print(f"❌ ABORT: DATABASE_NAME is '{settings.DATABASE_NAME}'.")
        print(f"   This script only runs against: {ALLOWED_DB_NAMES}")
        sys.exit(1)

# ─── Dummy data ───────────────────────────────────────────────────────────────
DUMMY_INSTITUTIONS = [
    {
        "name": "Sunshine Daycare",
        "address": "123 Maple St",
        "city": "Toronto",
        "province": "ON",
        "phone": "416-555-0101",
        "email": "hello@sunshine-daycare.ca",
        "status": "active",
        "admin": {
            "username": "sunshine_admin",
            "firstName": "Jane",
            "lastName": "Cooper",
            "password": "Dev12345!",
        },
    },
    {
        "name": "Little Stars Learning Center",
        "address": "456 Oak Ave",
        "city": "Mississauga",
        "province": "ON",
        "phone": "905-555-0202",
        "email": "info@littlestars.ca",
        "status": "active",
        "admin": {
            "username": "littlestars_admin",
            "firstName": "Mark",
            "lastName": "Evans",
            "password": "Dev12345!",
        },
    },
    {
        "name": "Happy Panda Childcare",
        "address": "789 Pine Rd",
        "city": "Brampton",
        "province": "ON",
        "phone": "905-555-0303",
        "email": "contact@happypanda.ca",
        "status": "active",
        "admin": {
            "username": "happypanda_admin",
            "firstName": "Sarah",
            "lastName": "Kim",
            "password": "Dev12345!",
        },
    },
]

# ─── Seed logic ───────────────────────────────────────────────────────────────
async def seed():
    abort_if_prod()
    print(f"🌱 Seeding dev data into '{settings.DATABASE_NAME}'...")

    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]

    inserted_institutions = 0
    inserted_admins = 0

    for inst_data in DUMMY_INSTITUTIONS:
        admin_data = inst_data.pop("admin")

        # Check if institution already exists
        existing = await db.institutions.find_one({"name": inst_data["name"]})
        if existing:
            print(f"  ⏭️  Institution '{inst_data['name']}' already exists, skipping.")
            continue

        # Create institution
        inst = InstitutionInDB(**inst_data)
        inst_result = await db.institutions.insert_one(inst.model_dump(by_alias=True))
        inst_id = inst_result.inserted_id
        inserted_institutions += 1
        print(f"  ✅ Created institution: {inst_data['name']}")

        # Create institution admin user
        existing_admin = await db.users.find_one({"username": admin_data["username"]})
        if not existing_admin:
            admin_user = UserInDB(
                username=admin_data["username"],
                role="admin",
                passwordHash=get_password_hash(admin_data["password"]),
                profile={
                    "firstName": admin_data["firstName"],
                    "lastName": admin_data["lastName"],
                },
                institution_id=str(inst_id)
            )
            await db.users.insert_one(admin_user.model_dump(by_alias=True))
            inserted_admins += 1
            print(f"  ✅ Created admin: {admin_data['username']}")
        else:
            print(f"  ⏭️  Admin '{admin_data['username']}' already exists, reusing.")

    print(f"\n✨ Done! Inserted {inserted_institutions} institution(s) and {inserted_admins} admin(s).")
    print(f"   School admin password for all dummy accounts: Dev12345!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed())
