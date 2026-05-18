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
    await db.db.invitations.create_index("token", unique=True)
    await db.db.invitations.create_index("expires_at", expireAfterSeconds=0)
    # Agent threads
    await db.db.conversations.create_index([("user_id", 1), ("updated_at", -1)])
    await db.db.messages.create_index([("conversation_id", 1), ("created_at", 1)])
    await db.db.jobs.create_index([("status", 1), ("created_at", 1)])
    print("Indexes ensured.")

async def close_mongo_connection():
    if db.client:
        db.client.close()
        print("Closed MongoDB connection")

def get_database():
    return db.db
