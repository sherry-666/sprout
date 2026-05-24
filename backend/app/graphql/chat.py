"""
Direct messaging between educators and parents about a specific kid.

Each kid has one chat thread. Participants:
  - Educators whose classes include the kid
  - Parent accounts linked via kid.parent_user_ids
"""
from __future__ import annotations
import asyncio
import logging
import uuid
from datetime import datetime
from typing import Optional, List, AsyncGenerator
from collections import defaultdict

import strawberry
from strawberry.types import Info

from app.graphql.context import GraphQLContext
from app.graphql.permissions import IsAuthenticated
from app.graphql.scalars import DateTime

log = logging.getLogger(__name__)

# ─── PubSub ────────────────────────────────────────────────────────────────

_subscribers: dict[str, list[asyncio.Queue]] = defaultdict(list)


def _subscribe(kid_id: str) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue()
    _subscribers[kid_id].append(q)
    return q


def _unsubscribe(kid_id: str, q: asyncio.Queue) -> None:
    queues = _subscribers.get(kid_id, [])
    if q in queues:
        queues.remove(q)
    if not queues:
        _subscribers.pop(kid_id, None)


async def _publish(kid_id: str, doc: dict) -> None:
    for q in list(_subscribers.get(kid_id, [])):
        try:
            q.put_nowait(doc)
        except asyncio.QueueFull:
            pass


# ─── Types ─────────────────────────────────────────────────────────────────

@strawberry.type
class ChatMessage:
    id: strawberry.ID
    kid_id: strawberry.ID
    sender_id: strawberry.ID
    sender_name: str
    sender_role: str
    content: str
    created_at: DateTime

    @classmethod
    def from_doc(cls, doc: dict) -> "ChatMessage":
        return cls(
            id=strawberry.ID(str(doc["_id"])),
            kid_id=strawberry.ID(str(doc["kid_id"])),
            sender_id=strawberry.ID(str(doc["sender_id"])),
            sender_name=doc.get("sender_name", ""),
            sender_role=doc.get("sender_role", "educator"),
            content=doc.get("content", ""),
            created_at=doc.get("created_at", datetime.utcnow()),
        )


@strawberry.type
class KidThread:
    id: strawberry.ID
    name: str
    avatar_url: Optional[str]
    last_message: Optional[str]
    last_message_at: Optional[DateTime]
    last_sender_name: Optional[str]
    parent_names: List[str]
    class_name: Optional[str]
    unread_count: int


# ─── Access check ──────────────────────────────────────────────────────────

async def _check_access(db, viewer_id: str, kid_id: str, institution_id: str) -> bool:
    kid = await db.kids.find_one({"_id": kid_id, "institution_id": institution_id})
    if not kid:
        return False
    if viewer_id in (kid.get("parent_user_ids") or []):
        return True
    classes = await db.classes.find(
        {"educator_user_ids": viewer_id, "kid_ids": kid_id}
    ).to_list(1)
    return len(classes) > 0


# ─── Query ─────────────────────────────────────────────────────────────────

@strawberry.type
class ChatQuery:

    @strawberry.field(permission_classes=[IsAuthenticated])
    async def my_kid_threads(
        self, info: Info[GraphQLContext, None],
    ) -> List[KidThread]:
        from app.core.storage import safe_presign_get
        db = info.context.db
        viewer_id = info.context.viewer_id
        viewer = info.context.viewer
        role = (viewer.get("role") if viewer else None) or "educator"

        classes: list = []
        if role == "parent":
            kids = await db.kids.find({"parent_user_ids": viewer_id}).to_list(200)
        else:
            classes = await db.classes.find({"educator_user_ids": viewer_id}).to_list(50)
            kid_ids = list({k for cls in classes for k in cls.get("kid_ids", [])})
            kids = await db.kids.find({"_id": {"$in": kid_ids}}).to_list(500)

        if not kids:
            return []

        kid_ids_list = [k["_id"] for k in kids]

        # Last message per kid
        pipeline = [
            {"$match": {"kid_id": {"$in": kid_ids_list}}},
            {"$sort": {"created_at": -1}},
            {"$group": {"_id": "$kid_id", "doc": {"$first": "$$ROOT"}}},
        ]
        last_msgs = await db.chat_messages.aggregate(pipeline).to_list(500)
        last_by_kid = {m["_id"]: m["doc"] for m in last_msgs}

        # Batch-fetch parent first names
        all_parent_ids = list({
            pid for kid in kids for pid in (kid.get("parent_user_ids") or [])
        })
        parent_first_name_by_id: dict[str, str] = {}
        if all_parent_ids:
            parent_docs = await db.users.find({"_id": {"$in": all_parent_ids}}).to_list(500)
            for u in parent_docs:
                p = u.get("profile", {})
                first_name = p.get("firstName") or u.get("email", "Parent")
                parent_first_name_by_id[u["_id"]] = first_name

        # For educators: build kid→class name lookup
        kid_class_name: dict[str, str] = {}
        if role != "parent":
            for cls in classes:
                for kid_id in cls.get("kid_ids", []):
                    if kid_id not in kid_class_name:
                        kid_class_name[kid_id] = cls.get("name", "")

        # Unread counts — batch via aggregate then filter by last_read_at in Python
        reads = await db.chat_reads.find(
            {"user_id": viewer_id, "kid_id": {"$in": kid_ids_list}}
        ).to_list(500)
        reads_map = {r["kid_id"]: r["last_read_at"] for r in reads}

        unread_counts: dict[str, int] = {}
        if kid_ids_list:
            raw = await db.chat_messages.aggregate([
                {"$match": {"kid_id": {"$in": kid_ids_list}, "sender_id": {"$ne": viewer_id}}},
                {"$group": {"_id": "$kid_id", "dates": {"$push": "$created_at"}}},
            ]).to_list(500)
            for r in raw:
                kid_id = r["_id"]
                last_read = reads_map.get(kid_id)
                dates = r["dates"]
                if last_read:
                    unread_counts[kid_id] = sum(1 for d in dates if d > last_read)
                else:
                    unread_counts[kid_id] = len(dates)

        threads = []
        for kid in kids:
            ppk = kid.get("profilePhotoKey")
            avatar_url = safe_presign_get(ppk, expires_in=86400) if ppk else None
            name = f"{kid.get('firstName', '')} {kid.get('lastName', '')}".strip()
            last = last_by_kid.get(kid["_id"])
            parent_ids = kid.get("parent_user_ids") or []
            parent_names = [
                parent_first_name_by_id[pid]
                for pid in parent_ids
                if pid in parent_first_name_by_id
            ]
            threads.append(KidThread(
                id=strawberry.ID(kid["_id"]),
                name=name,
                avatar_url=avatar_url,
                last_message=last["content"] if last else None,
                last_message_at=last["created_at"] if last else None,
                last_sender_name=last["sender_name"] if last else None,
                parent_names=parent_names,
                class_name=kid_class_name.get(kid["_id"]),
                unread_count=unread_counts.get(kid["_id"], 0),
            ))

        threads.sort(key=lambda t: (
            t.last_message_at is None,
            -(t.last_message_at.timestamp() if t.last_message_at else 0),
        ))
        return threads

    @strawberry.field(permission_classes=[IsAuthenticated])
    async def kid_chat_messages(
        self, info: Info[GraphQLContext, None],
        kid_id: strawberry.ID,
        limit: int = 50,
    ) -> List[ChatMessage]:
        db = info.context.db
        viewer_id = info.context.viewer_id
        institution_id = info.context.viewer_institution_id
        if not await _check_access(db, viewer_id, str(kid_id), institution_id):
            raise Exception("Not authorised")
        docs = await db.chat_messages.find(
            {"kid_id": str(kid_id)}
        ).sort("created_at", -1).limit(min(limit, 200)).to_list(200)
        docs.reverse()
        return [ChatMessage.from_doc(d) for d in docs]


# ─── Mutation ──────────────────────────────────────────────────────────────

@strawberry.type
class ChatMutation:

    @strawberry.mutation(permission_classes=[IsAuthenticated])
    async def send_kid_chat(
        self, info: Info[GraphQLContext, None],
        kid_id: strawberry.ID,
        content: str,
    ) -> ChatMessage:
        db = info.context.db
        viewer_id = info.context.viewer_id
        viewer = info.context.viewer
        institution_id = info.context.viewer_institution_id
        if not await _check_access(db, viewer_id, str(kid_id), institution_id):
            raise Exception("Not authorised")
        p = (viewer.get("profile") or {}) if viewer else {}
        sender_name = f"{p.get('firstName', '')} {p.get('lastName', '')}".strip() or (viewer.get("email", "") if viewer else "")
        sender_role = (viewer.get("role") if viewer else None) or "educator"
        doc = {
            "_id": str(uuid.uuid4()),
            "kid_id": str(kid_id),
            "institution_id": institution_id,
            "sender_id": viewer_id,
            "sender_name": sender_name,
            "sender_role": sender_role,
            "content": content.strip(),
            "created_at": datetime.utcnow(),
        }
        await db.chat_messages.insert_one(doc)
        await _publish(str(kid_id), doc)
        return ChatMessage.from_doc(doc)

    @strawberry.mutation(permission_classes=[IsAuthenticated])
    async def mark_chat_read(
        self, info: Info[GraphQLContext, None],
        kid_id: strawberry.ID,
    ) -> bool:
        db = info.context.db
        viewer_id = info.context.viewer_id
        await db.chat_reads.update_one(
            {"user_id": viewer_id, "kid_id": str(kid_id)},
            {"$set": {"last_read_at": datetime.utcnow()}},
            upsert=True,
        )
        return True


# ─── Subscription ──────────────────────────────────────────────────────────

@strawberry.type
class ChatSubscription:

    @strawberry.subscription(permission_classes=[IsAuthenticated])
    async def kid_chat_message_added(
        self, info: Info[GraphQLContext, None],
        kid_id: strawberry.ID,
    ) -> AsyncGenerator[ChatMessage, None]:
        q = _subscribe(str(kid_id))
        try:
            while True:
                doc = await q.get()
                yield ChatMessage.from_doc(doc)
        finally:
            _chat_unsubscribe(str(kid_id), q)


def _chat_unsubscribe(kid_id: str, q: asyncio.Queue) -> None:
    _unsubscribe(kid_id, q)
