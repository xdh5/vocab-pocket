from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.integrations.doubao import DoubaoWordCardGenerator, WordCardGenerationError
from app.integrations.word_images import WordImageError, WordImageService
from app.models.word import EnrichmentStatus, ImageStatus, LearningMode, ReviewRating, Word
from app.models.word_form import WordForm
from app.repositories.words import WordRepository
from app.schemas.word import GeneratedWordCard, WordCreate


class WordService:
    review_intervals = {
        1: timedelta(minutes=5),
        2: timedelta(minutes=30),
        3: timedelta(hours=12),
        4: timedelta(days=1),
        5: timedelta(days=2),
        6: timedelta(days=4),
        7: timedelta(days=7),
        8: timedelta(days=15),
    }
    mastered_level = 8
    maintenance_interval = timedelta(days=30)

    def __init__(
        self,
        session: Session,
        user_id: int,
        card_generator: DoubaoWordCardGenerator | None = None,
        image_service: WordImageService | None = None,
    ):
        self.repository = WordRepository(session, user_id)
        self.user_id = user_id
        self.card_generator = card_generator
        self.image_service = image_service

    def list_words(self) -> list[Word]:
        return self.repository.list_recent()

    def list_review_queue(self) -> list[Word]:
        return self.repository.list_for_review()

    def record_review(self, word_id: int, rating: ReviewRating) -> Word | None:
        word = self.repository.get_by_id(word_id)
        if word is None:
            return None
        now = datetime.now(UTC)
        word.review_count += 1
        if rating == ReviewRating.KNOWN:
            was_mastered = word.is_mastered
            word.known_count += 1
            word.mastery_level = min(word.mastery_level + 1, self.mastered_level)
            word.is_mastered = word.mastery_level >= self.mastered_level
            word.mastered_at = word.mastered_at or now if word.is_mastered else None
            interval = (
                self.maintenance_interval if was_mastered else self.review_intervals[word.mastery_level]
            )
            word.next_review_at = now + interval
        else:
            word.mastery_level = 0
            word.is_mastered = False
            word.mastered_at = None
            word.next_review_at = now + timedelta(minutes=10)
        word.last_reviewed_at = now
        return self.repository.save(word)

    def record_encounter(self, payload: WordCreate) -> Word:
        encountered_form = payload.term.strip()
        word = self.repository.get_by_form(encountered_form)
        known_form = self.repository.get_form(encountered_form)

        if word is not None:
            word.add_count += 1
            if known_form is not None:
                known_form.add_count += 1
                known_form.last_seen_at = datetime.now(UTC)
            self._reset_mastery(word)
            self._apply_learning_mode(word, payload.mode)
            if word.enrichment_status != EnrichmentStatus.READY:
                word.enrichment_status = EnrichmentStatus.PENDING
                word.enrichment_error = ""
            return self.repository.save(word)

        headword = (payload.headword or encountered_form).strip()
        word = self.repository.get_by_term(headword)

        if word is None:
            word = Word(user_id=self.user_id, term=headword, note=payload.note.strip())
            self.repository.add(word)
        else:
            word.add_count += 1

        self._reset_mastery(word)
        self._apply_learning_mode(word, payload.mode)

        if known_form is None:
            word.forms.append(
                WordForm(
                    user_id=self.user_id,
                    form=encountered_form,
                    form_type=payload.form_type or "原形",
                )
            )
        else:
            known_form.add_count += 1
            known_form.last_seen_at = datetime.now(UTC)

        word.common_forms = self._merge_forms(word.common_forms, payload.common_forms, word.term)
        if word.enrichment_status != EnrichmentStatus.READY:
            word.enrichment_status = EnrichmentStatus.PENDING
            word.enrichment_error = ""
        return self.repository.save(word)

    def enrich_word(self, word_id: int) -> Word | None:
        word = self.repository.get_by_id(word_id)
        if word is None or word.enrichment_status == EnrichmentStatus.READY:
            return word
        if self.card_generator is None or not self.card_generator.is_configured:
            word.enrichment_status = EnrichmentStatus.NOT_CONFIGURED
            word.enrichment_error = "尚未配置火山方舟 API Key"
            return self.repository.save(word)
        try:
            card = self.card_generator.generate(word.term)
        except WordCardGenerationError as error:
            word.enrichment_status = EnrichmentStatus.FAILED
            word.enrichment_error = str(error)
            return self.repository.save(word)

        self._apply_card(word, card)
        word = self.repository.save(word)
        return self._attach_image(word, card)

    def _apply_card(self, word: Word, card: GeneratedWordCard) -> None:
        word.pronunciation = card.pronunciation
        word.meanings = [meaning.model_dump() for meaning in card.meanings]
        word.common_forms = self._merge_forms(word.common_forms, card.common_forms, word.term)
        word.collocations = [collocation.model_dump() for collocation in card.collocations]
        word.example_sentence = card.example_sentence
        word.example_translation = card.example_translation
        word.scenarios = card.scenarios
        word.frequency_level = card.frequency_level
        word.is_visualizable = card.is_visualizable
        word.image_prompt = card.image_prompt
        word.image_url = ""
        word.image_source = ""
        word.image_source_url = ""
        word.image_attribution = ""
        word.image_status = ImageStatus.PENDING if card.is_visualizable else ImageStatus.NOT_REQUESTED
        word.enrichment_status = EnrichmentStatus.READY
        word.enrichment_error = ""
        word.ai_model = self.card_generator.model
        word.enriched_at = datetime.now(UTC)

    def _attach_image(self, word: Word, card: GeneratedWordCard) -> Word:
        if card.is_visualizable and self.image_service is not None:
            try:
                image = self.image_service.find_or_generate(
                    word.id,
                    card.image_search_query,
                    card.image_prompt,
                )
                word.image_url = image.url
                word.image_source = image.source
                word.image_source_url = image.source_url
                word.image_attribution = image.attribution
                word.image_status = ImageStatus.READY
            except WordImageError:
                word.image_status = ImageStatus.FAILED
            return self.repository.save(word)
        return word

    @staticmethod
    def _merge_forms(
        current: list[str] | None,
        generated: list[str] | None,
        headword: str,
    ) -> list[str]:
        merged: list[str] = []
        seen: set[str] = set()
        for form in [headword, *(current or []), *(generated or [])]:
            clean_form = form.strip()
            normalized = clean_form.casefold()
            if clean_form and normalized not in seen:
                seen.add(normalized)
                merged.append(clean_form)
        return merged[:12]

    @staticmethod
    def _reset_mastery(word: Word) -> None:
        word.mastery_level = 0
        word.is_mastered = False
        word.next_review_at = datetime.now(UTC)
        word.mastered_at = None

    @staticmethod
    def _apply_learning_mode(word: Word, mode: LearningMode) -> None:
        word.has_listening_speaking = True
        if mode == LearningMode.READING:
            word.has_reading = True

    def delete_word(self, word_id: int) -> bool:
        word = self.repository.get_by_id(word_id)
        if word is None:
            return False
        self.repository.delete(word)
        self.repository.session.commit()
        return True
