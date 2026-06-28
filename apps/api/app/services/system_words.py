from sqlalchemy.orm import Session

from app.repositories.words import WordRepository
from app.services.word_picker import word_at_point


class SystemWordService:
    def __init__(self, session: Session, user_id: int):
        self.repository = WordRepository(session, user_id)

    def lookup_at_point(self, x: int, y: int) -> dict[str, str | int | None]:
        term = word_at_point(x, y)
        word = self.repository.get_by_term(term) if term else None
        return {"word": term, "add_count": word.add_count if word else 0}
