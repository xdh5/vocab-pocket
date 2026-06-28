from datetime import UTC, datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.word import EnrichmentStatus, Word
from app.models.word_form import WordForm


class WordRepository:
    def __init__(self, session: Session, user_id: int):
        self.session = session
        self.user_id = user_id

    def list_recent(self) -> list[Word]:
        return list(
            self.session.scalars(
                select(Word)
                .where(Word.user_id == self.user_id)
                .options(selectinload(Word.forms))
                .order_by(Word.id.desc())
            )
        )

    def list_for_review(self) -> list[Word]:
        statement = (
            select(Word)
            .where(
                Word.enrichment_status == EnrichmentStatus.READY,
                Word.user_id == self.user_id,
                or_(Word.next_review_at.is_(None), Word.next_review_at <= datetime.now(UTC)),
            )
            .order_by(Word.next_review_at.asc().nulls_first(), Word.id.asc())
        )
        return list(self.session.scalars(statement))

    def get_by_id(self, word_id: int) -> Word | None:
        return self.session.scalar(select(Word).where(Word.id == word_id, Word.user_id == self.user_id))

    def get_by_term(self, term: str) -> Word | None:
        return self.session.scalar(select(Word).where(Word.term == term, Word.user_id == self.user_id))

    def get_by_form(self, form: str) -> Word | None:
        statement = (
            select(Word)
            .join(WordForm)
            .where(WordForm.form == form, Word.user_id == self.user_id)
            .options(selectinload(Word.forms))
        )
        return self.session.scalar(statement)

    def get_form(self, form: str) -> WordForm | None:
        return self.session.scalar(
            select(WordForm).where(
                WordForm.form == form,
                WordForm.user_id == self.user_id,
            )
        )

    def add(self, word: Word) -> Word:
        self.session.add(word)
        return word

    def delete(self, word: Word) -> None:
        self.session.delete(word)

    def save(self, word: Word) -> Word:
        self.session.commit()
        self.session.refresh(word)
        return word
