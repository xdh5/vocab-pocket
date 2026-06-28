from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.word import EnrichmentStatus, FrequencyLevel, ImageStatus, LearningMode, ReviewRating


class WordMeaning(BaseModel):
    part_of_speech: str = Field(min_length=1, max_length=24)
    meaning: str = Field(min_length=1, max_length=300)


class WordCollocation(BaseModel):
    phrase: str = Field(min_length=1, max_length=160)
    chinese_meaning: str = Field(min_length=1, max_length=300)
    usage_explanation: str = Field(min_length=1, max_length=400)


class GeneratedWordCard(BaseModel):
    headword: str = Field(min_length=1, max_length=120)
    inflection_type: str = Field(default="原形", max_length=80)
    common_forms: list[str] = Field(default_factory=list, max_length=12)
    pronunciation: str = Field(default="", max_length=160)
    meanings: list[WordMeaning] = Field(min_length=1, max_length=6)
    collocations: list[WordCollocation] = Field(default_factory=list, max_length=6)
    example_sentence: str = Field(min_length=1, max_length=500)
    example_translation: str = Field(min_length=1, max_length=500)
    scenarios: list[str] = Field(default_factory=list, max_length=5)
    frequency_level: FrequencyLevel
    is_visualizable: bool = False
    image_search_query: str = Field(default="", max_length=240)
    image_prompt: str = Field(default="", max_length=1000)


class WordCreate(BaseModel):
    term: str = Field(min_length=1, max_length=120)
    headword: str | None = Field(default=None, max_length=120)
    form_type: str = Field(default="原形", max_length=80)
    common_forms: list[str] = Field(default_factory=list, max_length=12)
    note: str = Field(default="", max_length=1000)
    mode: LearningMode = LearningMode.READING

    @field_validator("term")
    @classmethod
    def term_must_not_be_blank(cls, value: str) -> str:
        term = value.strip()
        if not term:
            raise ValueError("Word cannot be blank")
        return term


class WordReviewCreate(BaseModel):
    rating: ReviewRating


class WordFormRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    form: str
    form_type: str
    add_count: int
    last_seen_at: datetime
    created_at: datetime


class WordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    term: str
    note: str
    has_listening_speaking: bool
    has_reading: bool
    add_count: int
    pronunciation: str
    meanings: list[WordMeaning]
    common_forms: list[str]
    forms: list[WordFormRead]
    collocations: list[WordCollocation]
    example_sentence: str
    example_translation: str
    scenarios: list[str]
    frequency_level: FrequencyLevel
    is_visualizable: bool
    image_url: str
    image_source: str
    image_source_url: str
    image_attribution: str
    image_status: ImageStatus
    enrichment_status: EnrichmentStatus
    enrichment_error: str
    ai_model: str
    enriched_at: datetime | None
    review_count: int
    known_count: int
    mastery_level: int
    is_mastered: bool
    next_review_at: datetime | None
    mastered_at: datetime | None
    last_reviewed_at: datetime | None
    created_at: datetime
