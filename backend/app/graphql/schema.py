from __future__ import annotations
import base64
import secrets
import logging
import uuid as uuid_lib
from datetime import datetime, timedelta
from typing import Optional, List, Annotated
from bson import ObjectId

import strawberry
from strawberry.fastapi import GraphQLRouter
from strawberry.subscriptions import GRAPHQL_TRANSPORT_WS_PROTOCOL, GRAPHQL_WS_PROTOCOL
from strawberry.types import Info

from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.email import (
    send_institution_admin_invite,
    send_educator_invite,
    send_parent_invite,
    send_parent_new_kid_notification,
    is_whitelisted,
)
from app.graphql.context import GraphQLContext, get_context
from app.graphql.permissions import IsAuthenticated, IsAdmin, IsSuperAdmin, IsParent, IsEducator
from app.graphql.scalars import EmailAddress
from app.graphql.enums import UserRole, UserStatus, InstitutionStatus
from app.graphql.inputs import (
    LoginInput, ActivateInput, RegisterUserInput,
    CreateInstitutionInput, InviteEducatorInput,
    RegisterKidInput, UpdateKidInput, ParentInput, CreateClassInput, AssignClassInput, CreateUpdateInput,
    QuickLogUpdateInput,
)
from app.graphql.types import (
    Node, User, Institution, Kid, Class, Update,
    KidConnection, KidEdge, UpdateConnection, UpdateEdge,
    AuthPayload, InvitationInfo, InvitationSent, KidRegistered, Profile, PageInfo,
    PresignedUpload,
    EligibleKid, QuickLogPhotoResult, QuickLogKidSuggestion, QuickLogAnalysis,
)
from app.graphql.errors import (
    InvalidCredentialsError, AccountPendingError,
    TokenNotFoundError, TokenExpiredError, TokenUsedError,
    EmailAlreadyRegisteredError, EmailNotWhitelistedError, ValidationError,
    LoginResult, ActivateResult, ValidateTokenResult, InviteResult, RegisterKidResult,
)
from app.graphql.pagination import encode_cursor, decode_cursor
from app.graphql.agents import AgentsQuery, AgentsMutation, AgentsSubscription
from app.models.user import UserInDB, UserProfile, UserRole as ModelUserRole, UserStatus as ModelUserStatus
from app.models.institution import InstitutionInDB, InstitutionStatus as ModelInstStatus
from app.models.invitation import InvitationToken
from app.models.kid import KidInDB

logger = logging.getLogger(__name__)

_ALLOWED_PHOTO_TYPES = frozenset({"image/jpeg", "image/jpg", "image/png", "image/webp"})


# ─── Query ────────────────────────────────────────────────────────────

@strawberry.type
class Query(AgentsQuery):

    @strawberry.field
    async def node(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> Optional[Node]:
        db = info.context.db
        
        doc = await info.context.loaders.institution_by_id.load(str(id))
        if doc:
            return Institution.from_doc(doc)
            
        doc = await info.context.loaders.user_by_id.load(str(id))
        if doc:
            return User.from_doc(doc)
            
        doc = await info.context.loaders.kid_by_id.load(str(id))
        if doc:
            return Kid.from_doc(doc)
            
        doc = await info.context.loaders.class_by_id.load(str(id))
        if doc:
            return Class.from_doc(doc)
            
        doc = await db.updates.find_one({"_id": str(id)})
        if doc:
            return Update.from_doc(doc)
            
        return None

    @strawberry.field(permission_classes=[IsAuthenticated])
    async def me(self, info: Info[GraphQLContext, None]) -> Optional[User]:
        return User.from_doc(info.context.viewer)

    @strawberry.field(permission_classes=[IsAuthenticated])
    async def institutions(self, info: Info[GraphQLContext, None]) -> List[Institution]:
        db = info.context.db
        role = info.context.viewer_role
        if role == "super_admin":
            docs = await db.institutions.find({"status": {"$ne": "deleted"}}).to_list(200)
        elif role in ("admin", "educator"):
            inst_id = info.context.viewer_institution_id
            if not inst_id:
                return []
            doc = await db.institutions.find_one({"_id": inst_id, "status": {"$ne": "deleted"}})
            docs = [doc] if doc else []
        else:
            return []
        return [Institution.from_doc(d) for d in docs]

    @strawberry.field(permission_classes=[IsAuthenticated])
    async def institution(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> Optional[Institution]:
        db = info.context.db
        role = info.context.viewer_role
        inst_id = str(id)
        if role not in ("super_admin", "admin", "educator"):
            return None
        if role in ("admin", "educator") and info.context.viewer_institution_id != inst_id:
            return None
        doc = await db.institutions.find_one({"_id": inst_id})
        return Institution.from_doc(doc) if doc else None

    @strawberry.field(permission_classes=[IsAuthenticated])
    async def kids(
        self,
        info: Info[GraphQLContext, None],
        first: int = 50,
        after: Optional[str] = None,
        search: Optional[str] = None,
    ) -> KidConnection:
        db = info.context.db
        role = info.context.viewer_role
        query: dict = {}

        if role == "parent":
            query["parent_user_ids"] = info.context.viewer_id
        elif role in ("admin", "super_admin"):
            inst_id = info.context.viewer_institution_id
            if inst_id:
                query["institution_id"] = inst_id
        elif role == "educator":
            # Educator sees kids in their classes
            class_docs = await db.classes.find(
                {"educator_user_ids": info.context.viewer_id}
            ).to_list(50)
            kid_ids = [kid_id for c in class_docs for kid_id in c.get("kid_ids", [])]
            query["_id"] = {"$in": kid_ids}
        else:
            return KidConnection(edges=[], page_info=PageInfo(has_next_page=False, has_previous_page=False), total_count=0)

        if search and search.strip():
            pattern = {"$regex": f"^{search.strip()}", "$options": "i"}
            query["$or"] = [
                {"firstName": pattern},
                {"lastName": pattern},
            ]

        if after:
            created_at_iso, doc_id = decode_cursor(after)
            after_dt = datetime.fromisoformat(created_at_iso)
            cursor_filter = [
                {"createdAt": {"$gt": after_dt}},
                {"createdAt": after_dt, "_id": {"$gt": doc_id}},
            ]
            if "$or" in query:
                query["$and"] = [{"$or": query.pop("$or")}, {"$or": cursor_filter}]
            else:
                query["$or"] = cursor_filter

        base_query = {k: v for k, v in query.items() if k not in ("$or", "$and")}
        total = await db.kids.count_documents(base_query)
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

    @strawberry.field(permission_classes=[IsAuthenticated])
    async def kid(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> Optional[Kid]:
        db = info.context.db
        doc = await db.kids.find_one({"_id": str(id)})
        if not doc:
            return None
        # Scope check
        role = info.context.viewer_role
        if role == "parent" and info.context.viewer_id not in doc.get("parent_user_ids", []):
            return None
        if role in ("admin", "educator") and doc.get("institution_id") != info.context.viewer_institution_id:
            return None
        return Kid.from_doc(doc)

    @strawberry.field(permission_classes=[IsEducator])
    async def classes(self, info: Info[GraphQLContext, None]) -> List[Class]:
        db = info.context.db
        role = info.context.viewer_role
        if role == "super_admin":
            docs = await db.classes.find({}).to_list(500)
        elif role == "educator":
            docs = await db.classes.find(
                {"educator_user_ids": info.context.viewer_id}
            ).to_list(500)
        else:
            docs = await db.classes.find(
                {"institution_id": info.context.viewer_institution_id}
            ).to_list(500)
        return [Class.from_doc(d) for d in docs]

    @strawberry.field(name="class", permission_classes=[IsAuthenticated])
    async def class_(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> Optional[Class]:
        db = info.context.db
        doc = await db.classes.find_one({"_id": str(id)})
        if not doc:
            try:
                doc = await db.classes.find_one({"_id": ObjectId(str(id))})
            except Exception:
                pass
        return Class.from_doc(doc) if doc else None

    @strawberry.field(permission_classes=[IsAdmin])
    async def users(
        self,
        info: Info[GraphQLContext, None],
        role: Optional[UserRole] = None,
        search: Optional[str] = None,
        limit: int = 500,
    ) -> List[User]:
        db = info.context.db
        query: dict = {"institution_id": info.context.viewer_institution_id}
        if role:
            query["role"] = role.value
        else:
            query["role"] = {"$in": ["admin", "educator"]}
        if search and search.strip():
            pattern = {"$regex": f"^{search.strip()}", "$options": "i"}
            query["$or"] = [
                {"profile.firstName": pattern},
                {"profile.lastName": pattern},
            ]
        docs = await db.users.find(query).to_list(limit)
        return [User.from_doc(d) for d in docs]

    @strawberry.field
    async def validate_invitation_token(
        self,
        info: Info[GraphQLContext, None],
        token: str,
    ) -> ValidateTokenResult:
        db = info.context.db
        inv = await db.invitations.find_one({"token": token})
        if not inv:
            return TokenNotFoundError()
        if inv.get("used"):
            return TokenUsedError()
        if inv["expires_at"] < datetime.utcnow():
            return TokenExpiredError()

        user = await db.users.find_one({"_id": inv["user_id"]})
        institution = await db.institutions.find_one({"_id": inv["institution_id"]})
        if not user or not institution:
            return TokenNotFoundError()

        return InvitationInfo(
            email=user.get("email"),
            first_name=user["profile"]["firstName"],
            last_name=user["profile"]["lastName"],
            role=inv["role"],
            institution_name=institution["name"],
        )


# ─── Mutation ─────────────────────────────────────────────────────────

@strawberry.type
class Mutation(AgentsMutation):

    # ── Auth ──────────────────────────────────────────────────────────

    @strawberry.mutation
    async def register(
        self,
        info: Info[GraphQLContext, None],
        input: RegisterUserInput,
    ) -> User:
        db = info.context.db
        existing = await db.users.find_one({"email": input.email})
        if existing:
            raise ValueError("Email already registered")

        user_dict = {
            "email": input.email,
            "role": input.role.value,
            "profile": {
                "firstName": input.profile.first_name,
                "lastName": input.profile.last_name,
                "phone": input.profile.phone,
                "avatarUrl": input.profile.avatar_url,
            },
            "status": "active",
            "institution_id": str(input.institution_id) if input.institution_id else None,
            "passwordHash": get_password_hash(input.password),
        }
        inst = UserInDB(**{
            "email": input.email,
            "role": ModelUserRole(input.role.value),
            "profile": UserProfile(
                firstName=input.profile.first_name,
                lastName=input.profile.last_name,
                phone=input.profile.phone,
                avatarUrl=input.profile.avatar_url,
            ),
            "institution_id": str(input.institution_id) if input.institution_id else None,
            "status": ModelUserStatus.active,
        })
        data = inst.model_dump(by_alias=True)
        data["passwordHash"] = get_password_hash(input.password)
        result = await db.users.insert_one(data)
        doc = await db.users.find_one({"_id": result.inserted_id})
        return User.from_doc(doc)

    @strawberry.mutation
    async def login(
        self,
        info: Info[GraphQLContext, None],
        input: LoginInput,
    ) -> LoginResult:
        db = info.context.db
        user = await db.users.find_one({
            "$or": [{"email": input.login}, {"username": input.login}]
        })

        if not user or not verify_password(input.password, user.get("passwordHash", "")):
            return InvalidCredentialsError()

        if user.get("status") == "pending":
            return AccountPendingError()

        if user.get("role") in ("admin", "educator") and user.get("institution_id"):
            institution = await db.institutions.find_one({"_id": user["institution_id"]})
            if not institution or institution.get("status") == "deleted":
                return InvalidCredentialsError()

        token = create_access_token(data={"sub": str(user["_id"]), "role": user["role"]})
        return AuthPayload(
            access_token=token,
            token_type="bearer",
            user=User.from_doc(user),
        )

    @strawberry.mutation
    async def activate_account(
        self,
        info: Info[GraphQLContext, None],
        input: ActivateInput,
    ) -> ActivateResult:
        db = info.context.db
        inv = await db.invitations.find_one({"token": input.token})
        if not inv:
            return TokenNotFoundError()
        if inv.get("used"):
            return TokenUsedError()
        if inv["expires_at"] < datetime.utcnow():
            return TokenExpiredError()

        password_hash = get_password_hash(input.password)
        await db.users.update_one(
            {"_id": inv["user_id"]},
            {"$set": {
                "passwordHash": password_hash,
                "status": "active",
                "updatedAt": datetime.utcnow(),
            }},
        )
        await db.invitations.update_one(
            {"_id": inv["_id"]},
            {"$set": {"used": True}},
        )

        user = await db.users.find_one({"_id": inv["user_id"]})
        token = create_access_token(data={"sub": str(user["_id"]), "role": user["role"]})
        return AuthPayload(
            access_token=token,
            token_type="bearer",
            user=User.from_doc(user),
        )

    # ── Institutions ───────────────────────────────────────────────────

    @strawberry.mutation(permission_classes=[IsSuperAdmin])
    async def create_institution(
        self,
        info: Info[GraphQLContext, None],
        input: CreateInstitutionInput,
    ) -> Institution:
        db = info.context.db

        if input.admin_email and input.admin_first_name and input.admin_last_name:
            if not is_whitelisted(input.admin_email):
                raise ValueError(f"Email {input.admin_email} is not in the dev whitelist")
            existing = await db.users.find_one({"email": input.admin_email})
            if existing:
                raise ValueError("Email already registered")

        inst = InstitutionInDB(
            name=input.name,
            address=input.address,
            city=input.city,
            province=input.province,
            phone=input.phone,
            email=input.email,
        )
        result = await db.institutions.insert_one(inst.model_dump(by_alias=True))
        inst_doc = await db.institutions.find_one({"_id": result.inserted_id})
        inst_id = str(result.inserted_id)

        if input.admin_email and input.admin_first_name and input.admin_last_name:
            pending = UserInDB(
                email=input.admin_email,
                role=ModelUserRole.admin,
                profile=UserProfile(
                    firstName=input.admin_first_name,
                    lastName=input.admin_last_name,
                ),
                institution_id=inst_id,
                status=ModelUserStatus.pending,
            )
            user_result = await db.users.insert_one(pending.model_dump(by_alias=True))
            token = secrets.token_urlsafe(32)
            invitation = InvitationToken(
                token=token,
                user_id=user_result.inserted_id,
                institution_id=result.inserted_id,
                role=ModelUserRole.admin,
            )
            await db.invitations.insert_one(invitation.model_dump())
            try:
                send_institution_admin_invite(
                    to_email=input.admin_email,
                    token=token,
                    institution_name=input.name,
                    first_name=input.admin_first_name,
                )
            except Exception as e:
                logger.error("Failed to send admin invite: %s", e)

        return Institution.from_doc(inst_doc)

    @strawberry.mutation(permission_classes=[IsSuperAdmin])
    async def delete_institution(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> Optional[Institution]:
        db = info.context.db
        inst_id = str(id)
        doc = await db.institutions.find_one({"_id": inst_id, "status": {"$ne": "deleted"}})
        if not doc:
            raise ValueError("Institution not found")
        await db.institutions.update_one(
            {"_id": inst_id},
            {"$set": {"status": "deleted"}},
        )
        doc["status"] = "deleted"
        return Institution.from_doc(doc)

    # ── Users ──────────────────────────────────────────────────────────

    @strawberry.mutation(permission_classes=[IsAdmin])
    async def invite_educator(
        self,
        info: Info[GraphQLContext, None],
        input: InviteEducatorInput,
    ) -> InviteResult:
        db = info.context.db
        institution_id = info.context.viewer_institution_id
        if not institution_id:
            raise ValueError("Admin has no associated institution")

        if not is_whitelisted(input.email):
            return EmailNotWhitelistedError(
                message=f"Email {input.email} is not in the dev whitelist",
                email=input.email,
            )

        existing = await db.users.find_one({"email": input.email})
        if existing:
            return EmailAlreadyRegisteredError(
                message="Email already registered",
                email=input.email,
            )

        institution = await db.institutions.find_one({"_id": institution_id})
        if not institution:
            raise ValueError("Institution not found")

        pending = UserInDB(
            email=input.email,
            role=ModelUserRole.educator,
            profile=UserProfile(firstName=input.first_name, lastName=input.last_name),
            institution_id=institution_id,
            status=ModelUserStatus.pending,
        )
        user_result = await db.users.insert_one(pending.model_dump(by_alias=True))
        token = secrets.token_urlsafe(32)
        invitation = InvitationToken(
            token=token,
            user_id=user_result.inserted_id,
            institution_id=institution_id,
            role=ModelUserRole.educator,
        )
        await db.invitations.insert_one(invitation.model_dump())

        viewer = info.context.viewer
        invited_by = f"{viewer['profile']['firstName']} {viewer['profile']['lastName']}"
        try:
            send_educator_invite(
                to_email=input.email,
                token=token,
                institution_name=institution["name"],
                first_name=input.first_name,
                invited_by=invited_by,
            )
        except Exception as e:
            logger.error("Failed to send educator invite: %s", e)

        return InvitationSent(email=input.email, sent=True)

    # ── Kids ───────────────────────────────────────────────────────────

    @strawberry.mutation(permission_classes=[IsAdmin])
    async def register_kid(
        self,
        info: Info[GraphQLContext, None],
        input: RegisterKidInput,
    ) -> RegisterKidResult:
        if not input.parents:
            return ValidationError(field="parents", message="At least one parent is required")

        db = info.context.db
        institution_id = info.context.viewer_institution_id
        institution = await db.institutions.find_one({"_id": institution_id})
        if not institution:
            raise ValueError("Institution not found")

        try:
            dob = datetime.strptime(input.date_of_birth, "%Y-%m-%d")
        except ValueError:
            return ValidationError(field="dateOfBirth", message="Use YYYY-MM-DD format")

        parent_user_ids: list[str] = []
        emails_invited: list[str] = []

        for parent in input.parents:
            existing = await db.users.find_one({"email": parent.email})
            if existing:
                parent_user_ids.append(str(existing["_id"]))
                try:
                    if is_whitelisted(parent.email):
                        send_parent_new_kid_notification(
                            to_email=parent.email,
                            institution_name=institution["name"],
                            first_name=existing["profile"]["firstName"],
                            kid_name=f"{input.first_name} {input.last_name}",
                        )
                except Exception as e:
                    logger.error("Failed to send new-kid notification: %s", e)
                continue

            pending = UserInDB(
                email=parent.email,
                role=ModelUserRole.parent,
                profile=UserProfile(
                    firstName=parent.first_name,
                    lastName=parent.last_name,
                    phone=parent.phone,
                ),
                institution_id=institution_id,
                status=ModelUserStatus.pending,
            )
            user_result = await db.users.insert_one(pending.model_dump(by_alias=True))
            new_id = str(user_result.inserted_id)
            parent_user_ids.append(new_id)

            token = secrets.token_urlsafe(32)
            invitation = InvitationToken(
                token=token,
                user_id=user_result.inserted_id,
                institution_id=institution_id,
                role=ModelUserRole.parent,
            )
            await db.invitations.insert_one(invitation.model_dump())

            try:
                if is_whitelisted(parent.email):
                    send_parent_invite(
                        to_email=parent.email,
                        token=token,
                        institution_name=institution["name"],
                        first_name=parent.first_name,
                        kid_name=f"{input.first_name} {input.last_name}",
                    )
                    emails_invited.append(parent.email)
            except Exception as e:
                logger.error("Failed to send parent invite: %s", e)

        kid = KidInDB(
            firstName=input.first_name,
            lastName=input.last_name,
            gender=input.gender.value,
            dateOfBirth=dob,
            parent_user_ids=parent_user_ids,
            institution_id=institution_id,
        )
        result = await db.kids.insert_one(kid.model_dump(by_alias=True))
        kid_doc = await db.kids.find_one({"_id": result.inserted_id})

        return KidRegistered(kid=Kid.from_doc(kid_doc), emails_invited=emails_invited)

    # ── Kid edits ─────────────────────────────────────────────────────

    @strawberry.mutation(permission_classes=[IsAdmin])
    async def update_kid(
        self,
        info: Info[GraphQLContext, None],
        kid_id: strawberry.ID,
        input: UpdateKidInput,
    ) -> Kid:
        db = info.context.db
        kid_doc = await db.kids.find_one({"_id": str(kid_id)})
        if not kid_doc:
            raise ValueError("Kid not found")
        if kid_doc.get("institution_id") != info.context.viewer_institution_id:
            raise PermissionError("Kid belongs to a different institution")

        updates: dict = {}
        if input.first_name is not None:
            updates["firstName"] = input.first_name
        if input.last_name is not None:
            updates["lastName"] = input.last_name
        if input.gender is not None:
            updates["gender"] = input.gender.value
        if input.date_of_birth is not None:
            try:
                updates["dateOfBirth"] = datetime.strptime(input.date_of_birth, "%Y-%m-%d")
            except ValueError:
                raise ValueError("date_of_birth must be YYYY-MM-DD")

        if updates:
            await db.kids.update_one({"_id": str(kid_id)}, {"$set": updates})
        updated = await db.kids.find_one({"_id": str(kid_id)})
        return Kid.from_doc(updated)

    @strawberry.mutation(permission_classes=[IsAdmin])
    async def add_kid_parent(
        self,
        info: Info[GraphQLContext, None],
        kid_id: strawberry.ID,
        parent: ParentInput,
    ) -> Kid:
        db = info.context.db
        institution_id = info.context.viewer_institution_id

        kid_doc = await db.kids.find_one({"_id": str(kid_id)})
        if not kid_doc:
            raise ValueError("Kid not found")
        if kid_doc.get("institution_id") != institution_id:
            raise PermissionError("Kid belongs to a different institution")

        institution = await db.institutions.find_one({"_id": institution_id})
        if not institution:
            raise ValueError("Institution not found")

        kid_name = f"{kid_doc['firstName']} {kid_doc['lastName']}"
        existing = await db.users.find_one({"email": parent.email})
        if existing:
            parent_id = str(existing["_id"])
            if parent_id not in kid_doc.get("parent_user_ids", []):
                await db.kids.update_one(
                    {"_id": str(kid_id)},
                    {"$addToSet": {"parent_user_ids": parent_id}},
                )
                try:
                    if is_whitelisted(parent.email):
                        send_parent_new_kid_notification(
                            to_email=parent.email,
                            institution_name=institution["name"],
                            first_name=existing["profile"]["firstName"],
                            kid_name=kid_name,
                        )
                except Exception as e:
                    logger.error("Failed to send parent notification: %s", e)
        else:
            pending = UserInDB(
                email=parent.email,
                role=ModelUserRole.parent,
                profile=UserProfile(
                    firstName=parent.first_name,
                    lastName=parent.last_name,
                    phone=parent.phone,
                ),
                institution_id=institution_id,
                status=ModelUserStatus.pending,
            )
            user_result = await db.users.insert_one(pending.model_dump(by_alias=True))
            new_id = str(user_result.inserted_id)
            token = secrets.token_urlsafe(32)
            invitation = InvitationToken(
                token=token,
                user_id=user_result.inserted_id,
                institution_id=institution_id,
                role=ModelUserRole.parent,
            )
            await db.invitations.insert_one(invitation.model_dump())
            await db.kids.update_one(
                {"_id": str(kid_id)},
                {"$addToSet": {"parent_user_ids": new_id}},
            )
            try:
                if is_whitelisted(parent.email):
                    send_parent_invite(
                        to_email=parent.email,
                        token=token,
                        institution_name=institution["name"],
                        first_name=parent.first_name,
                        kid_name=kid_name,
                    )
            except Exception as e:
                logger.error("Failed to send parent invite: %s", e)

        updated = await db.kids.find_one({"_id": str(kid_id)})
        return Kid.from_doc(updated)

    @strawberry.mutation(permission_classes=[IsAdmin])
    async def remove_kid_parent(
        self,
        info: Info[GraphQLContext, None],
        kid_id: strawberry.ID,
        parent_user_id: strawberry.ID,
    ) -> Kid:
        db = info.context.db
        kid_doc = await db.kids.find_one({"_id": str(kid_id)})
        if not kid_doc:
            raise ValueError("Kid not found")
        if kid_doc.get("institution_id") != info.context.viewer_institution_id:
            raise PermissionError("Kid belongs to a different institution")

        await db.kids.update_one(
            {"_id": str(kid_id)},
            {"$pull": {"parent_user_ids": str(parent_user_id)}},
        )
        updated = await db.kids.find_one({"_id": str(kid_id)})
        return Kid.from_doc(updated)

    # ── Kid photos ────────────────────────────────────────────────────

    @strawberry.mutation(permission_classes=[IsAuthenticated])
    async def presign_kid_photo_upload(
        self,
        info: Info[GraphQLContext, None],
        kid_id: strawberry.ID,
        content_type: str,
    ) -> PresignedUpload:
        from app.core.storage import presign_put, storage_configured
        if not storage_configured():
            raise ValueError("Photo storage is not configured")
        if content_type not in _ALLOWED_PHOTO_TYPES:
            raise ValueError(f"content_type must be one of {_ALLOWED_PHOTO_TYPES}")

        db = info.context.db
        kid_doc = await db.kids.find_one({"_id": str(kid_id)})
        if not kid_doc:
            raise ValueError("Kid not found")

        role = info.context.viewer_role
        inst_id = kid_doc.get("institution_id", "")
        if role == "parent":
            if info.context.viewer_id not in kid_doc.get("parent_user_ids", []):
                raise PermissionError("Not a parent of this kid")
        elif role in ("admin", "educator"):
            if info.context.viewer_institution_id != inst_id:
                raise PermissionError("Kid belongs to a different institution")
        elif role != "super_admin":
            raise PermissionError("Insufficient permissions")

        raw_uuid = uuid_lib.uuid4().hex
        object_key = f"institutions/{inst_id}/kids/{str(kid_id)}/raw-{raw_uuid}.jpg"
        ttl = 300  # 5 minutes
        upload_url = presign_put(object_key, content_type, expires_in=ttl)
        return PresignedUpload(
            upload_url=upload_url,
            object_key=object_key,
            expires_at=datetime.utcnow() + timedelta(seconds=ttl),
        )

    @strawberry.mutation(permission_classes=[IsAuthenticated])
    async def confirm_kid_photo_upload(
        self,
        info: Info[GraphQLContext, None],
        kid_id: strawberry.ID,
        object_key: str,
    ) -> Kid:
        from app.core.storage import get_object, put_object, delete, storage_configured
        from app.ai.image_processor import process
        if not storage_configured():
            raise ValueError("Photo storage is not configured")

        db = info.context.db
        kid_doc = await db.kids.find_one({"_id": str(kid_id)})
        if not kid_doc:
            raise ValueError("Kid not found")

        inst_id = kid_doc.get("institution_id", "")
        role = info.context.viewer_role
        if role == "parent":
            if info.context.viewer_id not in kid_doc.get("parent_user_ids", []):
                raise PermissionError("Not a parent of this kid")
        elif role in ("admin", "educator"):
            if info.context.viewer_institution_id != inst_id:
                raise PermissionError("Kid belongs to a different institution")
        elif role != "super_admin":
            raise PermissionError("Insufficient permissions")

        expected_prefix = f"institutions/{inst_id}/kids/{str(kid_id)}/"
        if not object_key.startswith(expected_prefix):
            raise ValueError("Invalid object key")

        import logging
        log = logging.getLogger(__name__)
        log.info("confirm_kid_photo_upload: downloading raw key=%s", object_key)
        raw_bytes = get_object(object_key)
        log.info("confirm_kid_photo_upload: raw downloaded (%d bytes), processing", len(raw_bytes))
        try:
            processed = process(raw_bytes)
        except ValueError as e:
            delete(object_key)
            raise ValueError(f"Image processing failed: {e}") from e

        full_key = f"institutions/{inst_id}/kids/{str(kid_id)}/profile.jpg"
        thumb_key = f"institutions/{inst_id}/kids/{str(kid_id)}/profile-thumb.jpg"
        log.info("confirm_kid_photo_upload: uploading full=%s thumb=%s", full_key, thumb_key)
        put_object(full_key, processed.full, "image/jpeg")
        put_object(thumb_key, processed.thumbnail, "image/jpeg")
        delete(object_key)

        await db.kids.update_one(
            {"_id": str(kid_id)},
            {"$set": {"profilePhotoKey": full_key}},
        )
        log.info("confirm_kid_photo_upload: saved profilePhotoKey=%s for kid=%s", full_key, kid_id)

        # Generate and store face embedding from the thumbnail (non-fatal)
        try:
            from app.ai.face_recognizer import encode_face
            embedding = encode_face(processed.thumbnail)
            if embedding:
                await db.kids.update_one(
                    {"_id": str(kid_id)},
                    {"$set": {"faceEmbedding": embedding}},
                )
                log.info("confirm_kid_photo_upload: stored face embedding for kid=%s (%d dims)", kid_id, len(embedding))
        except Exception as emb_err:
            log.info("confirm_kid_photo_upload: face embedding skipped: %s", emb_err)

        updated = await db.kids.find_one({"_id": str(kid_id)})
        return Kid.from_doc(updated)

    # ── Classes ────────────────────────────────────────────────────────

    @strawberry.mutation(permission_classes=[IsAdmin])
    async def create_class(
        self,
        info: Info[GraphQLContext, None],
        input: CreateClassInput,
    ) -> Class:
        db = info.context.db
        institution_id = info.context.viewer_institution_id
        class_id = str(ObjectId())
        doc = {
            "_id": class_id,
            "name": input.name,
            "institution_id": institution_id,
            "educator_user_ids": [],
            "kid_ids": [],
            "createdAt": datetime.utcnow(),
        }
        await db.classes.insert_one(doc)
        created = await db.classes.find_one({"_id": class_id})
        return Class.from_doc(created)

    @strawberry.mutation(permission_classes=[IsAdmin])
    async def assign_class(
        self,
        info: Info[GraphQLContext, None],
        input: AssignClassInput,
    ) -> Class:
        db = info.context.db
        class_id = str(input.class_id)

        doc = await db.classes.find_one({"_id": class_id})
        if not doc:
            try:
                doc = await db.classes.find_one({"_id": ObjectId(class_id)})
            except Exception:
                pass
        if not doc:
            raise ValueError(f"Class {class_id} not found")
        actual_id = doc["_id"]

        updates: dict = {}
        if input.name is not None:
            updates["name"] = input.name
        if input.educator_ids is not None:
            updates["educator_user_ids"] = [str(i) for i in input.educator_ids]
        if input.kid_ids is not None:
            updates["kid_ids"] = [str(i) for i in input.kid_ids]

        if updates:
            await db.classes.update_one({"_id": actual_id}, {"$set": updates})
        doc = await db.classes.find_one({"_id": actual_id})
        return Class.from_doc(doc)

    @strawberry.mutation(permission_classes=[IsAdmin])
    async def delete_class(
        self,
        info: Info[GraphQLContext, None],
        class_id: strawberry.ID,
    ) -> bool:
        db = info.context.db
        cid = str(class_id)

        doc = await db.classes.find_one({"_id": cid})
        if not doc:
            try:
                doc = await db.classes.find_one({"_id": ObjectId(cid)})
            except Exception:
                pass
        if not doc:
            return False
        actual_id = doc["_id"]

        await db.classes.delete_one({"_id": actual_id})
        return True

    # ── Updates ────────────────────────────────────────────────────────

    @strawberry.mutation(permission_classes=[IsAuthenticated])
    async def create_update(
        self,
        info: Info[GraphQLContext, None],
        input: CreateUpdateInput,
    ) -> Update:
        db = info.context.db
        doc = {
            "kid_id": str(input.kid_id) if input.kid_id else None,
            "educator_user_id": info.context.viewer_id,
            "class_id": str(input.class_id),
            "type": input.type.value,
            "content": input.content,
            "mediaUrls": input.media_urls or [],
            "detected_kid_ids": [],
            "timestamp": datetime.utcnow(),
        }
        result = await db.updates.insert_one(doc)
        created = await db.updates.find_one({"_id": result.inserted_id})
        return Update.from_doc(created)

    # ── Quick Log ──────────────────────────────────────────────────────

    @strawberry.mutation(permission_classes=[IsAuthenticated])
    async def presign_quick_log_photo(
        self,
        info: Info[GraphQLContext, None],
        content_type: str,
    ) -> PresignedUpload:
        from app.core.storage import presign_put, storage_configured
        if not storage_configured():
            raise ValueError("Photo storage is not configured")
        if content_type not in _ALLOWED_PHOTO_TYPES:
            raise ValueError(f"content_type must be one of {_ALLOWED_PHOTO_TYPES}")
        viewer_id = info.context.viewer_id
        raw_key = f"quick-log/{viewer_id}/raw-{uuid_lib.uuid4().hex}.jpg"
        ttl = 300
        upload_url = presign_put(raw_key, content_type, expires_in=ttl)
        return PresignedUpload(
            upload_url=upload_url,
            object_key=raw_key,
            expires_at=datetime.utcnow() + timedelta(seconds=ttl),
        )

    @strawberry.mutation(permission_classes=[IsAuthenticated])
    async def transcribe_audio(
        self,
        info: Info[GraphQLContext, None],
        audio_base64: str,
        audio_mime_type: str = "audio/m4a",
    ) -> str:
        from app.ai.voice_parser import transcribe_audio as _transcribe
        audio_bytes = base64.b64decode(audio_base64)
        return await _transcribe(audio_bytes, audio_mime_type)

    @strawberry.mutation(permission_classes=[IsAuthenticated])
    async def analyze_quick_log(
        self,
        info: Info[GraphQLContext, None],
        class_id: Optional[strawberry.ID] = None,
        audio_base64: Optional[str] = None,
        audio_mime_type: str = "audio/m4a",
        transcript: Optional[str] = None,
        photo_keys: Optional[List[str]] = None,
    ) -> QuickLogAnalysis:
        from app.ai.face_recognizer import match_faces
        from app.ai.voice_parser import transcribe_audio, parse_transcript, describe_scene, generate_photo_update
        from app.core.storage import get_object, safe_presign_get

        db = info.context.db
        viewer_id = info.context.viewer_id

        # ── Collect eligible kids ────────────────────────────────────
        if class_id:
            cls_doc = await db.classes.find_one({"_id": str(class_id)})
            kid_ids = cls_doc.get("kid_ids", []) if cls_doc else []
            kids = await db.kids.find({"_id": {"$in": kid_ids}}).to_list(200)
        else:
            educator_classes = await db.classes.find(
                {"educator_user_ids": viewer_id}
            ).to_list(50)
            all_kid_ids = list({k for cls in educator_classes for k in cls.get("kid_ids", [])})
            kids = await db.kids.find({"_id": {"$in": all_kid_ids}}).to_list(500)

        kid_map = {k["_id"]: k for k in kids}
        candidates = {k["_id"]: k["faceEmbedding"] for k in kids if k.get("faceEmbedding")}

        eligible_kids = []
        for k in kids:
            pk = k.get("profilePhotoKey")
            eligible_kids.append(EligibleKid(
                id=strawberry.ID(k["_id"]),
                first_name=k.get("firstName", ""),
                last_name=k.get("lastName", ""),
                avatar_url=safe_presign_get(pk) if pk else None,
            ))

        # ── Voice: transcribe + parse ────────────────────────────────
        final_transcript = transcript or ""
        voice_suggestions: list[dict] = []
        if not final_transcript and audio_base64:
            audio_bytes = base64.b64decode(audio_base64)
            final_transcript = await transcribe_audio(audio_bytes, audio_mime_type)
            log.info("analyze_quick_log: transcript=%s", final_transcript[:120])
        if final_transcript:
            kids_info = [
                {"id": k["_id"], "name": f"{k.get('firstName','')} {k.get('lastName','')}".strip()}
                for k in kids
            ]
            voice_suggestions = await parse_transcript(final_transcript, kids_info)

        transcript = final_transcript
        voice_map = {s["kid_id"]: s["content"] for s in voice_suggestions}

        # ── Photos: face recognition + scene description ─────────────
        photo_results: list[QuickLogPhotoResult] = []
        photo_kid_map: dict[str, list[str]] = {}  # photo_key → [kid_id]

        for pk in (photo_keys or []):
            try:
                photo_bytes = get_object(pk)
            except Exception as e:
                log.warning("analyze_quick_log: cannot fetch photo %s: %s", pk, e)
                continue

            detected = match_faces(photo_bytes, candidates)
            detected_ids = [kid_id for kid_id, _ in detected]
            log.info("analyze_quick_log: photo=%s detected=%s", pk, detected_ids)

            scene = await describe_scene(photo_bytes)
            photo_kid_map[pk] = detected_ids
            photo_url = safe_presign_get(pk) or ""
            photo_results.append(QuickLogPhotoResult(
                photo_key=pk,
                photo_url=photo_url,
                detected_kid_ids=[strawberry.ID(kid_id) for kid_id in detected_ids],
                scene_description=scene,
            ))

        # ── Build per-kid update suggestions ────────────────────────
        kid_photo_map: dict[str, list[str]] = {}
        for pk, kid_ids in photo_kid_map.items():
            for kid_id in kid_ids:
                kid_photo_map.setdefault(kid_id, []).append(pk)

        involved = set(voice_map.keys()) | {kid_id for ids in photo_kid_map.values() for kid_id in ids}
        suggestions: list[QuickLogKidSuggestion] = []
        for kid_id in involved:
            kid = kid_map.get(str(kid_id))
            if not kid:
                continue
            kid_name = f"{kid.get('firstName','')} {kid.get('lastName','')}".strip()
            content = voice_map.get(str(kid_id), "")
            if not content:
                # Build update from photo scene description using Gemini
                scenes = [
                    pr.scene_description
                    for pr in photo_results
                    if kid_id in [str(i) for i in pr.detected_kid_ids] and pr.scene_description
                ]
                if scenes:
                    combined_scene = " ".join(scenes[:2])
                    content = await generate_photo_update(
                        kid_name=kid_name,
                        scene_description=combined_scene,
                        transcript=final_transcript,
                    )
                else:
                    content = ""
            pk = kid.get("profilePhotoKey")
            suggestions.append(QuickLogKidSuggestion(
                kid_id=strawberry.ID(str(kid_id)),
                kid_name=kid_name,
                avatar_url=safe_presign_get(pk) if pk else None,
                content=content,
                photo_keys=kid_photo_map.get(str(kid_id), []),
            ))

        return QuickLogAnalysis(
            transcript=transcript,
            suggestions=suggestions,
            photo_results=photo_results,
            eligible_kids=eligible_kids,
        )

    @strawberry.mutation(permission_classes=[IsAuthenticated])
    async def confirm_quick_log(
        self,
        info: Info[GraphQLContext, None],
        updates: List[QuickLogUpdateInput],
    ) -> List[Update]:
        from app.core.storage import safe_presign_get
        db = info.context.db
        viewer_id = info.context.viewer_id

        created_updates: list[Update] = []
        for upd in updates:
            kid_doc = await db.kids.find_one({"_id": str(upd.kid_id)})
            if not kid_doc:
                continue
            cls_doc = await db.classes.find_one({
                "kid_ids": str(upd.kid_id),
                "educator_user_ids": viewer_id,
            })
            doc = {
                "kid_id": str(upd.kid_id),
                "educator_user_id": viewer_id,
                "class_id": str(cls_doc["_id"]) if cls_doc else "",
                "type": "activity",
                "content": upd.content,
                "mediaUrls": [],
                "mediaKeys": list(upd.photo_keys),
                "detected_kid_ids": [],
                "timestamp": datetime.utcnow(),
            }
            result = await db.updates.insert_one(doc)
            doc["_id"] = result.inserted_id
            created_updates.append(Update.from_doc(doc))

        log.info("confirm_quick_log: created %d updates by educator %s", len(created_updates), viewer_id)
        return created_updates


# ─── Schema ────────────────────────────────────────────────────────────

schema = strawberry.Schema(
    query=Query,
    mutation=Mutation,
    subscription=AgentsSubscription,
)

graphql_router = GraphQLRouter(
    schema,
    context_getter=get_context,
    subscription_protocols=[
        GRAPHQL_TRANSPORT_WS_PROTOCOL,
        GRAPHQL_WS_PROTOCOL,
    ],
)
