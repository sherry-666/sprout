"""
GraphQL types, queries, mutations, and subscription for the Agents thread feature.

A Conversation is one AI workflow session for a user (e.g. one Quick Log
analysis). Messages stream into it as the worker progresses.

Clients call createQuickLogConversation to start a run, then subscribe to
messageAdded(conversationId) to receive new messages as they're produced.
"""
from __future__ import annotations
import asyncio
import json
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
from app.core import jobs as job_queue
from app.models.conversation import (
    CONVO_PENDING, CONVO_AWAITING_REVIEW, CONVO_SENT, CONVO_ACTIVE,
    KIND_TEXT, KIND_PROGRESS, KIND_DRAFT_CARD, KIND_ACTION,
    ROLE_AGENT, ROLE_SYSTEM, ROLE_USER,
    AGENT_QUICK_LOG, AGENT_CHAT, JOB_QUICK_LOG_ANALYSIS, JOB_CHAT_RESPONSE,
)

log = logging.getLogger(__name__)


# ─── PubSub for subscription fan-out ───────────────────────────────────────
# One asyncio.Queue per active subscriber, keyed by conversation_id.

_subscribers: dict[str, list[asyncio.Queue]] = defaultdict(list)


def _subscribe(conversation_id: str) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue()
    _subscribers[conversation_id].append(q)
    return q


def _unsubscribe(conversation_id: str, q: asyncio.Queue) -> None:
    queues = _subscribers.get(conversation_id, [])
    if q in queues:
        queues.remove(q)
    if not queues:
        _subscribers.pop(conversation_id, None)


async def publish_message(conversation_id: str, message_doc: dict) -> None:
    """Fan a newly written message out to every subscriber of its conversation."""
    for q in list(_subscribers.get(conversation_id, [])):
        try:
            q.put_nowait(message_doc)
        except asyncio.QueueFull:
            pass


# ─── Types ─────────────────────────────────────────────────────────────────

@strawberry.type
class Message:
    id: strawberry.ID
    conversation_id: strawberry.ID
    role: str
    kind: str
    content: str
    payload_json: str  # JSON-serialized for transport; client parses by kind
    created_at: DateTime

    @classmethod
    def from_doc(cls, doc: dict) -> "Message":
        return cls(
            id=strawberry.ID(str(doc["_id"])),
            conversation_id=strawberry.ID(str(doc["conversation_id"])),
            role=doc.get("role", ROLE_AGENT),
            kind=doc.get("kind", KIND_TEXT),
            content=doc.get("content", ""),
            payload_json=json.dumps(doc.get("payload", {}) or {}),
            created_at=doc.get("created_at", datetime.utcnow()),
        )


@strawberry.type
class Conversation:
    id: strawberry.ID
    agent_type: str
    status: str
    title: str
    class_id: Optional[strawberry.ID]
    error: Optional[str]
    created_at: DateTime
    updated_at: DateTime

    @strawberry.field
    async def messages(self, info: Info[GraphQLContext, None]) -> List[Message]:
        db = info.context.db
        docs = await db.messages.find(
            {"conversation_id": str(self.id)}
        ).sort("created_at", 1).to_list(500)
        return [Message.from_doc(d) for d in docs]

    @classmethod
    def from_doc(cls, doc: dict) -> "Conversation":
        return cls(
            id=strawberry.ID(str(doc["_id"])),
            agent_type=doc.get("agent_type", AGENT_QUICK_LOG),
            status=doc.get("status", CONVO_PENDING),
            title=doc.get("title", ""),
            class_id=strawberry.ID(doc["class_id"]) if doc.get("class_id") else None,
            error=doc.get("error"),
            created_at=doc.get("created_at", datetime.utcnow()),
            updated_at=doc.get("updated_at", datetime.utcnow()),
        )


# ─── Helpers used by the worker and mutations ──────────────────────────────

async def write_message(
    db,
    conversation_id: str,
    role: str,
    kind: str,
    content: str = "",
    payload: Optional[dict] = None,
) -> dict:
    """Insert a message + bump conversation.updated_at + publish to subscribers."""
    doc = {
        "_id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "role": role,
        "kind": kind,
        "content": content,
        "payload": payload or {},
        "created_at": datetime.utcnow(),
    }
    await db.messages.insert_one(doc)
    await db.conversations.update_one(
        {"_id": conversation_id},
        {"$set": {"updated_at": doc["created_at"]}},
    )
    await publish_message(conversation_id, doc)
    return doc


async def update_conversation_status(
    db, conversation_id: str, status: str, error: Optional[str] = None,
) -> None:
    update = {"status": status, "updated_at": datetime.utcnow()}
    if error is not None:
        update["error"] = error
    await db.conversations.update_one(
        {"_id": conversation_id},
        {"$set": update},
    )


# ─── Queries ───────────────────────────────────────────────────────────────

@strawberry.type
class AgentsQuery:
    @strawberry.field(permission_classes=[IsAuthenticated])
    async def conversation(
        self, info: Info[GraphQLContext, None], id: strawberry.ID,
    ) -> Optional[Conversation]:
        db = info.context.db
        viewer_id = info.context.viewer_id
        doc = await db.conversations.find_one({"_id": str(id), "user_id": viewer_id})
        return Conversation.from_doc(doc) if doc else None

    @strawberry.field(permission_classes=[IsAuthenticated])
    async def my_conversations(
        self, info: Info[GraphQLContext, None], limit: int = 50,
    ) -> List[Conversation]:
        db = info.context.db
        viewer_id = info.context.viewer_id
        docs = await db.conversations.find(
            {"user_id": viewer_id}
        ).sort("updated_at", -1).limit(min(limit, 200)).to_list(200)
        return [Conversation.from_doc(d) for d in docs]


# ─── Mutations ─────────────────────────────────────────────────────────────

@strawberry.type
class AgentsMutation:

    @strawberry.mutation(permission_classes=[IsAuthenticated])
    async def create_quick_log_conversation(
        self,
        info: Info[GraphQLContext, None],
        class_id: Optional[strawberry.ID] = None,
        transcript: Optional[str] = None,
        photo_keys: Optional[List[str]] = None,
    ) -> Conversation:
        """
        Create a Quick Log conversation, enqueue the analysis job, and
        return immediately. The worker streams progress messages and
        draft cards into the conversation via the messageAdded subscription.
        """
        db = info.context.db
        viewer_id = info.context.viewer_id
        now = datetime.utcnow()
        convo_id = str(uuid.uuid4())
        await db.conversations.insert_one({
            "_id": convo_id,
            "user_id": viewer_id,
            "agent_type": AGENT_QUICK_LOG,
            "status": CONVO_PENDING,
            "title": "Quick Log",
            "class_id": str(class_id) if class_id else None,
            "created_at": now,
            "updated_at": now,
        })
        await write_message(
            db, convo_id, role=ROLE_AGENT, kind=KIND_PROGRESS,
            content="Got it — analysing your voice note and photos…",
        )
        await job_queue.enqueue(db, JOB_QUICK_LOG_ANALYSIS, {
            "conversation_id": convo_id,
            "user_id": viewer_id,
            "class_id": str(class_id) if class_id else None,
            "transcript": transcript or "",
            "photo_keys": list(photo_keys or []),
        })
        doc = await db.conversations.find_one({"_id": convo_id})
        return Conversation.from_doc(doc)

    @strawberry.mutation(permission_classes=[IsAuthenticated])
    async def delete_conversation(
        self,
        info: Info[GraphQLContext, None],
        conversation_id: strawberry.ID,
    ) -> bool:
        """Delete a conversation and all its messages."""
        db = info.context.db
        viewer_id = info.context.viewer_id
        convo = await db.conversations.find_one(
            {"_id": str(conversation_id), "user_id": viewer_id}
        )
        if not convo:
            return False
        await db.messages.delete_many({"conversation_id": str(conversation_id)})
        await db.conversations.delete_one({"_id": str(conversation_id)})
        return True

    @strawberry.mutation(permission_classes=[IsAuthenticated])
    async def create_chat_conversation(
        self,
        info: Info[GraphQLContext, None],
    ) -> Conversation:
        """Create a new free-form chat conversation and return immediately with a greeting."""
        db = info.context.db
        viewer_id = info.context.viewer_id
        now = datetime.utcnow()
        convo_id = str(uuid.uuid4())
        await db.conversations.insert_one({
            "_id": convo_id,
            "user_id": viewer_id,
            "agent_type": AGENT_CHAT,
            "status": CONVO_ACTIVE,
            "title": "Chat",
            "created_at": now,
            "updated_at": now,
        })
        await write_message(
            db, convo_id, role=ROLE_AGENT, kind=KIND_TEXT,
            content="Hi! I'm your Sprout AI assistant. How can I help you today?",
        )
        doc = await db.conversations.find_one({"_id": convo_id})
        return Conversation.from_doc(doc)

    @strawberry.mutation(permission_classes=[IsAuthenticated])
    async def send_chat_message(
        self,
        info: Info[GraphQLContext, None],
        conversation_id: strawberry.ID,
        content: str,
    ) -> Message:
        """Write a user message and enqueue an AI reply job."""
        db = info.context.db
        viewer_id = info.context.viewer_id
        convo = await db.conversations.find_one(
            {"_id": str(conversation_id), "user_id": viewer_id}
        )
        if not convo:
            raise Exception("Conversation not found")
        msg = await write_message(
            db, str(conversation_id),
            role=ROLE_USER, kind=KIND_TEXT,
            content=content.strip(),
        )
        await job_queue.enqueue(db, JOB_CHAT_RESPONSE, {
            "conversation_id": str(conversation_id),
            "user_id": viewer_id,
        })
        return Message.from_doc(msg)

    @strawberry.mutation(permission_classes=[IsAuthenticated])
    async def update_draft_message(
        self,
        info: Info[GraphQLContext, None],
        message_id: strawberry.ID,
        content: str,
    ) -> Message:
        db = info.context.db
        viewer_id = info.context.viewer_id
        msg = await db.messages.find_one({"_id": str(message_id)})
        if not msg or msg.get("kind") != KIND_DRAFT_CARD:
            raise Exception("Draft not found")
        convo = await db.conversations.find_one({"_id": msg["conversation_id"]})
        if not convo or convo["user_id"] != viewer_id:
            raise Exception("Not authorised")
        await db.messages.update_one(
            {"_id": str(message_id)},
            {"$set": {"content": content}},
        )
        msg["content"] = content
        return Message.from_doc(msg)

    @strawberry.mutation(permission_classes=[IsAuthenticated])
    async def remove_draft_message(
        self,
        info: Info[GraphQLContext, None],
        message_id: strawberry.ID,
    ) -> bool:
        db = info.context.db
        viewer_id = info.context.viewer_id
        msg = await db.messages.find_one({"_id": str(message_id)})
        if not msg or msg.get("kind") != KIND_DRAFT_CARD:
            return False
        convo = await db.conversations.find_one({"_id": msg["conversation_id"]})
        if not convo or convo["user_id"] != viewer_id:
            return False
        await db.messages.delete_one({"_id": str(message_id)})
        return True

    @strawberry.mutation(permission_classes=[IsAuthenticated])
    async def send_conversation_drafts(
        self,
        info: Info[GraphQLContext, None],
        conversation_id: strawberry.ID,
    ) -> Conversation:
        """Approve every draft_card in the conversation as a real Update sent to parents."""
        db = info.context.db
        viewer_id = info.context.viewer_id
        convo = await db.conversations.find_one(
            {"_id": str(conversation_id), "user_id": viewer_id}
        )
        if not convo:
            raise Exception("Conversation not found")

        drafts = await db.messages.find(
            {"conversation_id": str(conversation_id), "kind": KIND_DRAFT_CARD}
        ).to_list(200)

        created_count = 0
        for draft in drafts:
            content = (draft.get("content") or "").strip()
            payload = draft.get("payload") or {}
            kid_id = payload.get("kid_id")
            photo_keys = payload.get("photo_keys") or []
            if not content or not kid_id:
                continue
            cls_doc = await db.classes.find_one({
                "kid_ids": str(kid_id),
                "educator_user_ids": viewer_id,
            })
            await db.updates.insert_one({
                "kid_id": str(kid_id),
                "educator_user_id": viewer_id,
                "class_id": str(cls_doc["_id"]) if cls_doc else "",
                "type": "activity",
                "content": content,
                "mediaUrls": [],
                "mediaKeys": list(photo_keys),
                "detected_kid_ids": [],
                "timestamp": datetime.utcnow(),
            })
            created_count += 1

        await write_message(
            db, str(conversation_id), role=ROLE_AGENT, kind=KIND_ACTION,
            content=f"Sent {created_count} update{'s' if created_count != 1 else ''} to parents.",
            payload={"sent_count": created_count},
        )
        await update_conversation_status(db, str(conversation_id), CONVO_SENT)
        doc = await db.conversations.find_one({"_id": str(conversation_id)})
        return Conversation.from_doc(doc)


# ─── Subscription ──────────────────────────────────────────────────────────

@strawberry.type
class AgentsSubscription:
    @strawberry.subscription(permission_classes=[IsAuthenticated])
    async def message_added(
        self,
        info: Info[GraphQLContext, None],
        conversation_id: strawberry.ID,
    ) -> AsyncGenerator[Message, None]:
        """Stream new messages for a conversation as they are written."""
        db = info.context.db
        viewer_id = info.context.viewer_id
        convo = await db.conversations.find_one(
            {"_id": str(conversation_id), "user_id": viewer_id}
        )
        if not convo:
            return

        q = _subscribe(str(conversation_id))
        try:
            while True:
                doc = await q.get()
                yield Message.from_doc(doc)
        finally:
            _unsubscribe(str(conversation_id), q)
