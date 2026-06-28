from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, Response, status

from app.api.dependencies import CurrentUser, DatabaseSession, bearer_token
from app.schemas.auth import LoginRequest, LoginResponse, UserRead, UserSettingsUpdate
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, session: DatabaseSession) -> LoginResponse:
    result = AuthService(session).login(payload.username, payload.password)
    if result is None:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    token, user = result
    return LoginResponse(token=token, user=UserRead.model_validate(user))


@router.get("/me", response_model=UserRead)
def me(user: CurrentUser) -> UserRead:
    return UserRead.model_validate(user)


@router.patch("/settings", response_model=UserRead)
def update_settings(
    payload: UserSettingsUpdate,
    user: CurrentUser,
    session: DatabaseSession,
) -> UserRead:
    user.daily_review_target = payload.daily_review_target
    user.daily_new_target = payload.daily_new_target
    session.commit()
    session.refresh(user)
    return UserRead.model_validate(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    session: DatabaseSession,
    authorization: Annotated[str | None, Header()] = None,
) -> Response:
    token = bearer_token(authorization)
    if token:
        AuthService(session).logout(token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
