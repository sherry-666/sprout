from typing import Any
import strawberry
from strawberry.types import Info


class IsAuthenticated(strawberry.BasePermission):
    message = "Authentication required"

    async def has_permission(self, source: Any, info: Info, **kwargs: Any) -> bool:
        return info.context.viewer is not None


class IsAdmin(strawberry.BasePermission):
    message = "Admin or super admin access required"

    async def has_permission(self, source: Any, info: Info, **kwargs: Any) -> bool:
        v = info.context.viewer
        return v is not None and v.get("role") in ("admin", "super_admin")


class IsSuperAdmin(strawberry.BasePermission):
    message = "Super admin access required"

    async def has_permission(self, source: Any, info: Info, **kwargs: Any) -> bool:
        v = info.context.viewer
        return v is not None and v.get("role") == "super_admin"


class IsParent(strawberry.BasePermission):
    message = "Parent access required"

    async def has_permission(self, source: Any, info: Info, **kwargs: Any) -> bool:
        v = info.context.viewer
        return v is not None and v.get("role") == "parent"


class IsEducator(strawberry.BasePermission):
    message = "Educator access required"

    async def has_permission(self, source: Any, info: Info, **kwargs: Any) -> bool:
        v = info.context.viewer
        return v is not None and v.get("role") in ("educator", "admin", "super_admin")
