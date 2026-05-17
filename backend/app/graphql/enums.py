import strawberry


@strawberry.enum
class UserRole(str):
    super_admin = "super_admin"
    admin = "admin"
    educator = "educator"
    parent = "parent"


@strawberry.enum
class UserStatus(str):
    active = "active"
    pending = "pending"


@strawberry.enum
class InstitutionStatus(str):
    active = "active"
    inactive = "inactive"
    deleted = "deleted"


@strawberry.enum
class Gender(str):
    male = "male"
    female = "female"


@strawberry.enum
class UpdateType(str):
    meal = "meal"
    nap = "nap"
    activity = "activity"
    photo = "photo"
    daily_summary = "daily_summary"


@strawberry.enum
class InvitationRole(str):
    admin = "admin"
    educator = "educator"
    parent = "parent"
