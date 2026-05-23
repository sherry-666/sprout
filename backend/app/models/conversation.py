"""
Conversation, Message, and Job models for the agent-thread async workflow.

A Conversation is an ongoing AI session for one user (e.g. a Quick Log analysis).
Messages within a conversation can be text, progress updates, draft cards,
or action receipts. Jobs are queue items consumed by an in-process worker.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field


# ─── Status enums (stored as plain strings) ────────────────────────────────

# Conversation lifecycle
CONVO_PENDING = "pending"                         # created, work not yet started
CONVO_PROCESSING = "processing"                   # worker actively generating
CONVO_AWAITING_PHOTO_REVIEW = "awaiting_photo_review"  # phase 1 done; educator reviews photo grouping
CONVO_AWAITING_REVIEW = "awaiting_review"         # phase 2 done; text drafts ready to send
CONVO_SENT = "sent"                               # drafts approved + delivered to parents
CONVO_FAILED = "failed"                           # worker errored

# Message roles
ROLE_SYSTEM = "system"
ROLE_AGENT = "agent"
ROLE_USER = "user"

# Message kinds — drive client-side rendering
KIND_TEXT = "text"
KIND_PROGRESS = "progress"
KIND_DRAFT_CARD = "draft_card"
KIND_ACTION = "action"

# Agent types — extensible registry
AGENT_QUICK_LOG = "quick_log"
AGENT_CHAT = "chat"

# Conversation statuses
CONVO_ACTIVE = "active"            # free-form chat, always open

# Job statuses
JOB_PENDING = "pending"
JOB_PROCESSING = "processing"
JOB_COMPLETED = "completed"
JOB_FAILED = "failed"

# Job types
JOB_QUICK_LOG_ANALYSIS = "quick_log_analysis"
JOB_QUICK_LOG_SUMMARIZE = "quick_log_summarize"
JOB_CHAT_RESPONSE = "chat_response"


# ─── Pydantic models ───────────────────────────────────────────────────────

class ConversationDoc(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    agent_type: str = AGENT_QUICK_LOG
    status: str = CONVO_PENDING
    title: str = ""
    class_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    error: Optional[str] = None

    class Config:
        populate_by_name = True


class MessageDoc(BaseModel):
    id: str = Field(alias="_id")
    conversation_id: str
    role: str
    kind: str
    content: str = ""
    payload: dict = Field(default_factory=dict)
    created_at: datetime

    class Config:
        populate_by_name = True


class JobDoc(BaseModel):
    id: str = Field(alias="_id")
    type: str
    payload: dict
    status: str = JOB_PENDING
    attempts: int = 0
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None

    class Config:
        populate_by_name = True
