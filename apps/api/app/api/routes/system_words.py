from fastapi import APIRouter

from app.api.dependencies import CurrentUser, DatabaseSession
from app.services.system_words import SystemWordService

router = APIRouter(tags=["system"])


@router.get("/word-at-point")
def get_word_at_point(
    x: int,
    y: int,
    session: DatabaseSession,
    user: CurrentUser,
) -> dict[str, str | int | None]:
    return SystemWordService(session, user.id).lookup_at_point(x, y)
