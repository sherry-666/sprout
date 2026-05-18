from __future__ import annotations
import logging
from datetime import datetime, date
from typing import Optional, List, TYPE_CHECKING
import strawberry
from strawberry.types import Info

from app.graphql.scalars import DateTime, Date, EmailAddress
from app.graphql.enums import UserRole, UserStatus, InstitutionStatus, Gender, UpdateType, InvitationRole
from app.graphql.pagination import PageInfo, encode_cursor, decode_cursor

logger = logging.getLogger(__name__)


# ─── Node Interface ───────────────────────────────────────────────────

@strawberry.interface
class Node:
    id: strawberry.ID


# ─── Profile ──────────────────────────────────────────────────────────

@strawberry.type
class Profile:
    first_name: str
    last_name: str
    phone: Optional[str]
    avatar_url: Optional[str]

    @strawberry.field
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @classmethod
    def from_doc(cls, doc: dict) -> Profile:
        return cls(
            first_name=doc.get("firstName", ""),
            last_name=doc.get("lastName", ""),
            phone=doc.get("phone"),
            avatar_url=doc.get("avatarUrl"),
        )


# ─── User ─────────────────────────────────────────────────────────────

@strawberry.type
class User(Node):
    id: strawberry.ID
    role: UserRole
    email: Optional[EmailAddress]
    username: Optional[str]
    status: UserStatus
    profile: Profile
    created_at: DateTime
    updated_at: DateTime

    institution_id_: strawberry.Private[Optional[str]]

    @strawberry.field
    async def institution(self, info: Info) -> Optional[Institution]:
        if not self.institution_id_:
            return None
        doc = await info.context.loaders.institution_by_id.load(self.institution_id_)
        return Institution.from_doc(doc) if doc else None

    @strawberry.field
    async def kids(self, info: Info) -> Optional[List[Kid]]:
        """Only populated for PARENT users, when the viewer is that parent or an admin."""
        v = info.context.viewer
        if v is None:
            return None
        if v.get("role") not in ("parent", "admin", "super_admin"):
            return None
        db = info.context.db
        docs = await db.kids.find({"parent_user_ids": str(self.id)}).to_list(200)
        return [Kid.from_doc(d) for d in docs]

    @strawberry.field
    async def classes(self, info: Info) -> Optional[List[Class]]:
        """Only populated for EDUCATOR users."""
        v = info.context.viewer
        if v is None:
            return None
        db = info.context.db
        docs = await db.classes.find(
            {"educator_user_ids": str(self.id)}
        ).to_list(100)
        return [Class.from_doc(d) for d in docs]

    @classmethod
    def from_doc(cls, doc: dict) -> User:
        return cls(
            id=strawberry.ID(str(doc["_id"])),
            role=UserRole(doc["role"]),
            email=doc.get("email"),
            username=doc.get("username"),
            status=UserStatus(doc.get("status", "active")),
            profile=Profile.from_doc(doc.get("profile", {})),
            created_at=doc.get("createdAt", datetime.utcnow()),
            updated_at=doc.get("updatedAt", datetime.utcnow()),
            institution_id_=doc.get("institution_id"),
        )


# ─── KidConnection ────────────────────────────────────────────────────
# Defined before Institution so Institution can reference it.

@strawberry.type
class KidEdge:
    node: Kid
    cursor: str


@strawberry.type
class KidConnection:
    edges: List[KidEdge]
    page_info: PageInfo
    total_count: int


# ─── Institution ──────────────────────────────────────────────────────

@strawberry.type
class Institution(Node):
    id: strawberry.ID
    name: str
    address: Optional[str]
    city: Optional[str]
    province: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    status: InstitutionStatus
    created_at: DateTime

    @strawberry.field
    async def admin(self, info: Info) -> Optional[User]:
        doc = await info.context.loaders.admin_by_institution_id.load(str(self.id))
        return User.from_doc(doc) if doc else None

    @strawberry.field
    async def educators(self, info: Info) -> List[User]:
        docs = await info.context.loaders.educators_by_institution_id.load(str(self.id))
        return [User.from_doc(d) for d in docs]

    @strawberry.field
    async def classes(self, info: Info) -> List[Class]:
        docs = await info.context.loaders.classes_by_institution_id.load(str(self.id))
        return [Class.from_doc(d) for d in docs]

    @strawberry.field
    async def kids(
        self,
        info: Info,
        first: int = 50,
        after: Optional[str] = None,
    ) -> KidConnection:
        db = info.context.db
        inst_id = str(self.id)
        query: dict = {"institution_id": inst_id}

        if after:
            created_at_iso, doc_id = decode_cursor(after)
            after_dt = datetime.fromisoformat(created_at_iso)
            query["$or"] = [
                {"createdAt": {"$gt": after_dt}},
                {"createdAt": after_dt, "_id": {"$gt": doc_id}},
            ]

        total = await db.kids.count_documents({"institution_id": inst_id})
        docs = await db.kids.find(query).sort(
            [("createdAt", 1), ("_id", 1)]
        ).limit(first + 1).to_list(first + 1)

        has_next = len(docs) > first
        docs = docs[:first]
        edges = [
            KidEdge(
                node=Kid.from_doc(d),
                cursor=encode_cursor(d.get("createdAt", datetime.utcnow()), str(d["_id"])),
            )
            for d in docs
        ]
        return KidConnection(
            edges=edges,
            page_info=PageInfo(
                has_next_page=has_next,
                has_previous_page=after is not None,
                start_cursor=edges[0].cursor if edges else None,
                end_cursor=edges[-1].cursor if edges else None,
            ),
            total_count=total,
        )

    @strawberry.field
    async def kid_count(self, info: Info) -> int:
        return await info.context.loaders.kid_count_by_institution_id.load(str(self.id))

    @strawberry.field
    async def class_count(self, info: Info) -> int:
        return await info.context.loaders.class_count_by_institution_id.load(str(self.id))

    @strawberry.field
    async def educator_count(self, info: Info) -> int:
        return await info.context.loaders.educator_count_by_institution_id.load(str(self.id))

    @classmethod
    def from_doc(cls, doc: dict) -> Institution:
        return cls(
            id=strawberry.ID(str(doc["_id"])),
            name=doc["name"],
            address=doc.get("address"),
            city=doc.get("city"),
            province=doc.get("province"),
            phone=doc.get("phone"),
            email=doc.get("email"),
            status=InstitutionStatus(doc.get("status", "active")),
            created_at=doc.get("createdAt", datetime.utcnow()),
        )


# ─── Class ────────────────────────────────────────────────────────────

@strawberry.type
class Class(Node):
    id: strawberry.ID
    name: str
    created_at: DateTime

    institution_id_: strawberry.Private[str]

    @strawberry.field
    async def institution(self, info: Info) -> Optional[Institution]:
        doc = await info.context.loaders.institution_by_id.load(self.institution_id_)
        return Institution.from_doc(doc) if doc else None

    @strawberry.field
    async def educators(self, info: Info) -> List[User]:
        docs = await info.context.loaders.educators_by_class_id.load(str(self.id))
        return [User.from_doc(d) for d in docs]

    @strawberry.field
    async def kids(self, info: Info) -> List[Kid]:
        docs = await info.context.loaders.kids_by_class_id.load(str(self.id))
        return [Kid.from_doc(d) for d in docs]

    @classmethod
    def from_doc(cls, doc: dict) -> Class:
        return cls(
            id=strawberry.ID(str(doc["_id"])),
            name=doc["name"],
            institution_id_=str(doc.get("institution_id", "")),
            created_at=doc.get("createdAt", datetime.utcnow()),
        )


# ─── UpdateConnection ─────────────────────────────────────────────────

@strawberry.type
class UpdateEdge:
    node: Update
    cursor: str


@strawberry.type
class UpdateConnection:
    edges: List[UpdateEdge]
    page_info: PageInfo


# ─── Kid ──────────────────────────────────────────────────────────────

@strawberry.type
class Kid(Node):
    id: strawberry.ID
    first_name: str
    last_name: str
    gender: Optional[Gender]
    date_of_birth: Optional[Date]
    profile_photo_url: Optional[str]
    created_at: DateTime

    institution_id_: strawberry.Private[str]
    class_id_: strawberry.Private[Optional[str]]

    @strawberry.field
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @strawberry.field
    def parent_count(self) -> int:
        return self._parent_count_

    _parent_count_: strawberry.Private[int]

    @strawberry.field
    async def institution(self, info: Info) -> Optional[Institution]:
        doc = await info.context.loaders.institution_by_id.load(self.institution_id_)
        return Institution.from_doc(doc) if doc else None

    @strawberry.field(name="class")
    async def class_(self, info: Info) -> Optional[Class]:
        if not self.class_id_:
            return None
        doc = await info.context.loaders.class_by_id.load(str(self.class_id_))
        return Class.from_doc(doc) if doc else None

    @strawberry.field
    async def parents(self, info: Info) -> List[User]:
        docs = await info.context.loaders.parents_by_kid_id.load(str(self.id))
        return [User.from_doc(d) for d in docs]

    @strawberry.field
    async def updates(
        self,
        info: Info,
        first: int = 20,
        after: Optional[str] = None,
        type: Optional[UpdateType] = None,
    ) -> UpdateConnection:
        db = info.context.db
        query: dict = {"kid_id": str(self.id)}
        if type:
            query["type"] = type.value
        if after:
            created_at_iso, doc_id = decode_cursor(after)
            after_dt = datetime.fromisoformat(created_at_iso)
            query["$or"] = [
                {"timestamp": {"$lt": after_dt}},
                {"timestamp": after_dt, "_id": {"$lt": doc_id}},
            ]
        docs = await db.updates.find(query).sort(
            [("timestamp", -1), ("_id", -1)]
        ).limit(first + 1).to_list(first + 1)

        has_next = len(docs) > first
        docs = docs[:first]
        edges = [
            UpdateEdge(
                node=Update.from_doc(d),
                cursor=encode_cursor(d.get("timestamp", datetime.utcnow()), str(d["_id"])),
            )
            for d in docs
        ]
        return UpdateConnection(
            edges=edges,
            page_info=PageInfo(
                has_next_page=has_next,
                has_previous_page=after is not None,
                start_cursor=edges[0].cursor if edges else None,
                end_cursor=edges[-1].cursor if edges else None,
            ),
        )

    @strawberry.field
    async def daily_summary(self, info: Info, date: Date) -> Optional[Update]:
        db = info.context.db
        start_dt = datetime.combine(date, datetime.min.time())
        end_dt = datetime.combine(date, datetime.max.time())

        # Check if an existing daily summary exists
        existing = await db.updates.find_one({
            "kid_id": str(self.id),
            "type": "daily_summary",
            "timestamp": {"$gte": start_dt, "$lte": end_dt}
        })
        if existing:
            return Update.from_doc(existing)

        # If not, generate a new one!
        # First, fetch all updates (except daily summaries) for this kid on this date
        updates = await db.updates.find({
            "kid_id": str(self.id),
            "type": {"$ne": "daily_summary"},
            "timestamp": {"$gte": start_dt, "$lte": end_dt}
        }).to_list(100)

        if not updates:
            return None

        from app.ai.llm_service import generate_daily_summary
        kid_name = f"{self.first_name} {self.last_name}"
        updates_text = [u.get("content", "") for u in updates if u.get("content")]

        if not updates_text:
            return None

        try:
            summary_content = await generate_daily_summary(kid_name, updates_text)
        except Exception as e:
            logger.error("Failed to generate AI daily summary: %s", e)
            summary_content = "Summary generation failed."

        # Find an educator to associate with this summary
        educator_user_id = updates[0].get("educator_user_id")
        if not educator_user_id:
            class_doc = None
            if self.class_id_:
                class_doc = await db.classes.find_one({"_id": self.class_id_})
            if class_doc and class_doc.get("educator_user_ids"):
                educator_user_id = class_doc["educator_user_ids"][0]
            else:
                educator_user_id = info.context.viewer_id or "000000000000000000000000"

        doc = {
            "kid_id": str(self.id),
            "educator_user_id": str(educator_user_id),
            "class_id": str(self.class_id_) if self.class_id_ else "",
            "type": "daily_summary",
            "content": summary_content,
            "mediaUrls": [],
            "detected_kid_ids": [],
            "timestamp": end_dt,
        }

        result = await db.updates.insert_one(doc)
        created = await db.updates.find_one({"_id": result.inserted_id})
        return Update.from_doc(created)

    @classmethod
    def from_doc(cls, doc: dict) -> Kid:
        dob = doc.get("dateOfBirth")
        if isinstance(dob, datetime):
            dob = dob.date()
        key = doc.get("profilePhotoKey")
        if key:
            try:
                from app.core.storage import safe_presign_get
                profile_photo_url = safe_presign_get(key)
            except Exception:
                profile_photo_url = None
        else:
            profile_photo_url = None
        return cls(
            id=strawberry.ID(str(doc["_id"])),
            first_name=doc.get("firstName", ""),
            last_name=doc.get("lastName", ""),
            gender=Gender(doc["gender"]) if doc.get("gender") else None,
            date_of_birth=dob,
            profile_photo_url=profile_photo_url,
            created_at=doc.get("createdAt", datetime.utcnow()),
            institution_id_=str(doc.get("institution_id", "")),
            class_id_=str(doc["class_id"]) if doc.get("class_id") else None,
            _parent_count_=len(doc.get("parent_user_ids", [])),
        )


# ─── Update ───────────────────────────────────────────────────────────

@strawberry.type
class Update(Node):
    id: strawberry.ID
    type: UpdateType
    content: str
    ai_generated_content: Optional[str]
    media_urls: List[str]
    timestamp: DateTime

    kid_id_: strawberry.Private[Optional[str]]
    educator_id_: strawberry.Private[str]
    class_id_: strawberry.Private[str]
    detected_kid_ids_: strawberry.Private[List[str]]

    @strawberry.field
    async def kid(self, info: Info) -> Optional[Kid]:
        if not self.kid_id_:
            return None
        doc = await info.context.loaders.kid_by_id.load(self.kid_id_)
        return Kid.from_doc(doc) if doc else None

    @strawberry.field
    async def educator(self, info: Info) -> Optional[User]:
        doc = await info.context.loaders.user_by_id.load(self.educator_id_)
        return User.from_doc(doc) if doc else None

    @strawberry.field(name="class")
    async def class_(self, info: Info) -> Optional[Class]:
        doc = await info.context.loaders.class_by_id.load(self.class_id_)
        return Class.from_doc(doc) if doc else None

    @strawberry.field
    async def detected_kids(self, info: Info) -> List[Kid]:
        if not self.detected_kid_ids_:
            return []
        docs = await info.context.loaders.kid_by_id.load_many(self.detected_kid_ids_)
        return [Kid.from_doc(d) for d in docs if d]

    @classmethod
    def from_doc(cls, doc: dict) -> Update:
        return cls(
            id=strawberry.ID(str(doc["_id"])),
            type=UpdateType(doc["type"]),
            content=doc.get("content", ""),
            ai_generated_content=doc.get("aiGeneratedContent"),
            media_urls=doc.get("mediaUrls", []),
            timestamp=doc.get("timestamp", datetime.utcnow()),
            kid_id_=str(doc["kid_id"]) if doc.get("kid_id") else None,
            educator_id_=str(doc.get("educator_user_id", "")),
            class_id_=str(doc.get("class_id", "")),
            detected_kid_ids_=[str(k) for k in doc.get("detected_kid_ids", [])],
        )


# ─── Presigned upload ─────────────────────────────────────────────────

@strawberry.type
class PresignedUpload:
    upload_url: str
    object_key: str
    expires_at: DateTime


# ─── Auth payloads ────────────────────────────────────────────────────

@strawberry.type
class AuthPayload:
    access_token: str
    token_type: str
    user: User


@strawberry.type
class InvitationInfo:
    email: Optional[EmailAddress]
    first_name: str
    last_name: str
    role: InvitationRole
    institution_name: str


@strawberry.type
class InvitationSent:
    email: EmailAddress
    sent: bool


@strawberry.type
class KidRegistered:
    kid: Kid
    emails_invited: List[EmailAddress]
