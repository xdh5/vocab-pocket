from datetime import UTC, datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.word_form import WordForm


class LearningMode(StrEnum):
    LISTENING_SPEAKING = "listening_speaking"
    READING = "reading"


class FrequencyLevel(StrEnum):
    ESSENTIAL = "重点"
    COMMON = "常用"
    RECOGNITION = "了解"
    DISCARDED = "废弃"


class EnrichmentStatus(StrEnum):
    PENDING = "pending"
    READY = "ready"
    FAILED = "failed"
    NOT_CONFIGURED = "not_configured"


class ImageStatus(StrEnum):
    NOT_REQUESTED = "not_requested"
    PENDING = "pending"
    READY = "ready"
    FAILED = "failed"


class ReviewRating(StrEnum):
    AGAIN = "again"
    KNOWN = "known"


class Word(Base):
    __tablename__ = "words"
    __table_args__ = (UniqueConstraint("user_id", "term", name="uq_words_user_term"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    term: Mapped[str] = mapped_column(String(120, collation="NOCASE"), index=True)
    note: Mapped[str] = mapped_column(Text, default="")
    has_listening_speaking: Mapped[bool] = mapped_column(Boolean, default=True)
    has_reading: Mapped[bool] = mapped_column(Boolean, default=False)
    add_count: Mapped[int] = mapped_column(Integer, default=1)
    pronunciation: Mapped[str] = mapped_column(String(160), default="")
    meanings: Mapped[list[dict[str, str]]] = mapped_column(JSON, default=list)
    common_forms: Mapped[list[str]] = mapped_column(JSON, default=list)
    collocations: Mapped[list[dict[str, str]]] = mapped_column(JSON, default=list)
    example_sentence: Mapped[str] = mapped_column(Text, default="")
    example_translation: Mapped[str] = mapped_column(Text, default="")
    scenarios: Mapped[list[str]] = mapped_column(JSON, default=list)
    is_visualizable: Mapped[bool] = mapped_column(Boolean, default=False)
    image_prompt: Mapped[str] = mapped_column(Text, default="")
    image_url: Mapped[str] = mapped_column(Text, default="")
    image_source: Mapped[str] = mapped_column(String(24), default="")
    image_source_url: Mapped[str] = mapped_column(Text, default="")
    image_attribution: Mapped[str] = mapped_column(Text, default="")
    image_status: Mapped[str] = mapped_column(String(24), default=ImageStatus.NOT_REQUESTED)
    frequency_level: Mapped[str] = mapped_column(String(20), default=FrequencyLevel.RECOGNITION)
    enrichment_status: Mapped[str] = mapped_column(String(24), default=EnrichmentStatus.PENDING)
    enrichment_error: Mapped[str] = mapped_column(Text, default="")
    ai_model: Mapped[str] = mapped_column(String(80), default="")
    enriched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    review_count: Mapped[int] = mapped_column(Integer, default=0)
    known_count: Mapped[int] = mapped_column(Integer, default=0)
    mastery_level: Mapped[int] = mapped_column(Integer, default=0)
    is_mastered: Mapped[bool] = mapped_column(Boolean, default=False)
    next_review_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=True
    )
    mastered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    forms: Mapped[list["WordForm"]] = relationship(
        back_populates="word",
        cascade="all, delete-orphan",
        order_by="WordForm.id",
        lazy="selectin",
    )
