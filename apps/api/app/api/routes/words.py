from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Response, status

from app.api.dependencies import AppSettings, CurrentUser, DatabaseSession
from app.integrations.doubao import DoubaoWordCardGenerator
from app.integrations.word_images import WordImageService
from app.schemas.word import WordCreate, WordRead, WordReviewCreate
from app.services.words import WordService

router = APIRouter(prefix="/words", tags=["words"])


def enrich_word_in_background(session_factory, settings: AppSettings, user_id: int, word_id: int) -> None:
    with session_factory() as session:
        generator = DoubaoWordCardGenerator(settings)
        image_service = WordImageService(settings)
        WordService(session, user_id, generator, image_service).enrich_word(word_id)


@router.get("", response_model=list[WordRead])
def list_words(session: DatabaseSession, user: CurrentUser) -> list[WordRead]:
    return WordService(session, user.id).list_words()


@router.get("/review", response_model=list[WordRead])
def list_review_queue(session: DatabaseSession, user: CurrentUser) -> list[WordRead]:
    return WordService(session, user.id).list_review_queue()


@router.post("", response_model=WordRead, status_code=status.HTTP_201_CREATED)
def create_word(
    payload: WordCreate,
    background_tasks: BackgroundTasks,
    request: Request,
    session: DatabaseSession,
    settings: AppSettings,
    user: CurrentUser,
) -> WordRead:
    word = WordService(session, user.id).record_encounter(payload)
    if word.enrichment_status != "ready":
        background_tasks.add_task(
            enrich_word_in_background,
            request.app.state.session_factory,
            settings,
            user.id,
            word.id,
        )
    return word


@router.post("/{word_id}/reviews", response_model=WordRead)
def review_word(
    word_id: int,
    payload: WordReviewCreate,
    session: DatabaseSession,
    user: CurrentUser,
) -> WordRead:
    word = WordService(session, user.id).record_review(word_id, payload.rating)
    if word is None:
        raise HTTPException(status_code=404, detail="Word not found")
    return word


@router.delete("/{word_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_word(word_id: int, session: DatabaseSession, user: CurrentUser) -> Response:
    if not WordService(session, user.id).delete_word(word_id):
        raise HTTPException(status_code=404, detail="Word not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
