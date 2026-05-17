from enum import Enum
import strawberry


@strawberry.enum
class UserRole(str, Enum):
    super_admin = "super_admin"
    admin = "admin"
    educator = "educator"
    parent = "parent"


@strawberry.enum
class UserStatus(str, Enum):
    active = "active"
    pending = "pending"


@strawberry.enum
class InstitutionStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    deleted = "deleted"


@strawberry.enum
class Gender(str, Enum):
    male = "male"
    female = "female"


@strawberry.enum
class UpdateType(str, Enum):
    meal = "meal"
    nap = "nap"
    activity = "activity"
    photo = "photo"
    daily_summary = "daily_summary"


@strawberry.enum
class InvitationRole(str, Enum):
    admin = "admin"
    educator = "educator"
    parent = "parent"
