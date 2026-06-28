from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.session import get_session
from app.models.user import User
from app.services.auth import AuthService

DatabaseSession = Annotated[Session, Depends(get_session)]


def get_app_settings(request: Request) -> Settings:
    return request.app.state.settings


AppSettings = Annotated[Settings, Depends(get_app_settings)]


def bearer_token(authorization: str | None) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization.removeprefix("Bearer ").strip() or None


def get_current_user(
    session: DatabaseSession,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    token = bearer_token(authorization)
    user = AuthService(session).user_for_token(token) if token else None
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
