from datetime import datetime, timedelta
from pydantic import BaseModel, Field
from app.models.user import PyObjectId, UserRole


class InvitationToken(BaseModel):
    """A one-time-use token sent to a user to activate their account."""
    token: str
    user_id: PyObjectId
    institution_id: PyObjectId
    role: UserRole
    expires_at: datetime = Field(
        default_factory=lambda: datetime.utcnow() + timedelta(hours=72)
    )
    used: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
