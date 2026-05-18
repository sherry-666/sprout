"""
Diagnostic + fix script for orphaned educator_user_ids in class documents.

Usage (local):
    python scripts/fix_educator_classes.py

Usage (Railway):
    railway run python scripts/fix_educator_classes.py
"""

import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


async def run():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]

    educators = await db.users.find({"role": "educator"}).to_list(200)
    valid_ids = {str(e["_id"]) for e in educators}

    print(f"Database : {settings.DATABASE_NAME}")
    print(f"Educators: {len(educators)}")
    for e in educators:
        classes = await db.classes.find({"educator_user_ids": str(e["_id"])}).to_list(50)
        status = e.get("status", "?")
        print(f"  [{status:7s}] {e['profile']['firstName']} {e['profile']['lastName']}  id={e['_id']}  → {len(classes)} class(es): {[c['name'] for c in classes]}")

    print()
    classes = await db.classes.find({}).to_list(200)
    orphans = []
    for c in classes:
        for eid in c.get("educator_user_ids", []):
            if str(eid) not in valid_ids:
                orphans.append((c["_id"], c["name"], str(eid)))

    if not orphans:
        print("No orphaned educator IDs found — data looks clean.")
        client.close()
        return

    print(f"Found {len(orphans)} orphaned educator ID(s):")
    for cid, cname, eid in orphans:
        print(f"  Class '{cname}' ({cid}) references missing educator {eid}")

    print()
    if len(educators) == 0:
        print("No educators exist — nothing to re-assign.")
        client.close()
        return

    print("Active educators available for re-assignment:")
    active = [e for e in educators if e.get("status") == "active"]
    for i, e in enumerate(active):
        print(f"  [{i}] {e['profile']['firstName']} {e['profile']['lastName']}  ({e['_id']})")

    if not active:
        print("No active educators found. Activate an educator account first.")
        client.close()
        return

    answer = input("\nEnter index of educator to assign orphaned classes to (or 'skip' to cancel): ").strip()
    if answer == "skip":
        print("Skipped.")
        client.close()
        return

    idx = int(answer)
    target = active[idx]
    new_id = str(target["_id"])

    for cid, cname, old_id in orphans:
        existing = await db.classes.find_one({"_id": cid})
        current_ids = [str(x) for x in existing.get("educator_user_ids", [])]
        updated_ids = [new_id if x == old_id else x for x in current_ids]
        await db.classes.update_one({"_id": cid}, {"$set": {"educator_user_ids": updated_ids}})
        print(f"  Updated class '{cname}': {old_id} → {new_id}")

    print("\nDone. Run the script again to verify.")
    client.close()


asyncio.run(run())
