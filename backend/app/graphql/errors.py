from __future__ import annotations
from typing import Annotated, Union, Optional
import strawberry
from app.graphql.scalars import EmailAddress


@strawberry.type
class InvalidCredentialsError:
    message: str = "Invalid email/username or password"


@strawberry.type
class AccountPendingError:
    message: str = "Account not yet activated. Check your email for the activation link."


@strawberry.type
class TokenNotFoundError:
    message: str = "Invitation token not found"


@strawberry.type
class TokenExpiredError:
    message: str = "Invitation token has expired"


@strawberry.type
class TokenUsedError:
    message: str = "Invitation token has already been used"


@strawberry.type
class EmailAlreadyRegisteredError:
    message: str
    email: EmailAddress


@strawberry.type
class EmailNotWhitelistedError:
    message: str
    email: EmailAddress


@strawberry.type
class ValidationError:
    field: str
    message: str


# ─── Result unions ────────────────────────────────────────────────────
LoginResult = Annotated[
    Union["AuthPayload", InvalidCredentialsError, AccountPendingError],
    strawberry.union("LoginResult"),
]

ActivateResult = Annotated[
    Union["AuthPayload", TokenNotFoundError, TokenExpiredError, TokenUsedError],
    strawberry.union("ActivateResult"),
]

ValidateTokenResult = Annotated[
    Union["InvitationInfo", TokenNotFoundError, TokenExpiredError, TokenUsedError],
    strawberry.union("ValidateTokenResult"),
]

InviteResult = Annotated[
    Union["InvitationSent", EmailAlreadyRegisteredError, EmailNotWhitelistedError],
    strawberry.union("InviteResult"),
]

RegisterKidResult = Annotated[
    Union["KidRegistered", EmailNotWhitelistedError, ValidationError],
    strawberry.union("RegisterKidResult"),
]
