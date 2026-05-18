from __future__ import annotations
from typing import Optional, Any
from fastapi import Request, WebSocket
from jose import jwt, JWTError
from strawberry.fastapi import BaseContext
from app.core.config import settings
from app.core.database import get_database
from app.graphql.loaders import Loaders, make_loaders

ALGORITHM = "HS256"


class GraphQLContext(BaseContext):
    def __init__(self, viewer: Optional[dict], db, loaders: Loaders):
        super().__init__()
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


def _token_from_ws_params(params: Any) -> Optional[str]:
    if not isinstance(params, dict):
        return None
    for key in ("Authorization", "authorization"):
        v = params.get(key)
        if isinstance(v, str):
            return v[7:] if v.startswith("Bearer ") else v
    tok = params.get("token")
    return tok if isinstance(tok, str) else None


async def get_context(request: Request = None, ws: WebSocket = None) -> GraphQLContext:
    """
    Builds the GraphQL context for both HTTP and WS transports.
    Strawberry passes `request` for HTTP and `ws` for WebSocket subscriptions.
    """
    db = get_database()
    loaders = make_loaders(db)
    viewer = None

    token: Optional[str] = None
    if request is not None:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    elif ws is not None:
        # Strawberry attaches the graphql-ws connection_init params here
        params = getattr(ws, "connection_params", None) or getattr(ws.scope, "get", lambda *_: None)("connection_params")
        token = _token_from_ws_params(params)

    if token:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
            user_id: Optional[str] = payload.get("sub")
            if user_id:
                viewer = await db.users.find_one({"_id": user_id})
        except JWTError:
            pass

    return GraphQLContext(viewer=viewer, db=db, loaders=loaders)
