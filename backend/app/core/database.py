from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

class Database:
    client: AsyncIOMotorClient = None
    db = None

db = Database()

async def connect_to_mongo():
    db.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db.db = db.client[settings.DATABASE_NAME]
    print(f"Connected to MongoDB: {settings.DATABASE_NAME}")

    # Ensure indexes
    await db.db.users.create_index("role")
    await db.db.users.create_index("institution_id")
    await db.db.users.create_index([("role", 1), ("institution_id", 1)])
    await db.db.users.create_index("username", sparse=True)
    await db.db.users.create_index("email", sparse=True)
    await db.db.institutions.create_index("status")
    print("Indexes ensured.")

async def close_mongo_connection():
    if db.client:
        db.client.close()
        print("Closed MongoDB connection")

def get_database():
    return db.db
