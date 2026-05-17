from __future__ import annotations
from typing import Optional
from fastapi import Request
from jose import jwt, JWTError
from app.core.config import settings
from app.core.database import get_database
from app.graphql.loaders import Loaders, make_loaders

ALGORITHM = "HS256"


class GraphQLContext:
    def __init__(self, viewer: Optional[dict], db, loaders: Loaders):
        self.viewer = viewer
        self.db = db
        self.loaders = loaders

    @property
    def viewer_id(self) -> Optional[str]:
        if self.viewer is None:
            return None
        return str(self.viewer["_id"])

    @property
    def viewer_role(self) -> Optional[str]:
        if self.viewer is None:
            return None
        return self.viewer.get("role")

    @property
    def viewer_institution_id(self) -> Optional[str]:
        if self.viewer is None:
            return None
        return self.viewer.get("institution_id")


async def get_context(request: Request) -> GraphQLContext:
    db = get_database()
    loaders = make_loaders(db)
    viewer = None

    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
            user_id: Optional[str] = payload.get("sub")
            if user_id:
                viewer = await db.users.find_one({"_id": user_id})
        except JWTError:
            pass

    return GraphQLContext(viewer=viewer, db=db, loaders=loaders)
