import sys
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_data_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path.cwd() / "data"
    return Path(__file__).resolve().parents[4] / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("apps/api/.env", ".env"),
        env_prefix="VOCABULARY_",
        extra="ignore",
    )

    app_name: str = "Vocaboom API"
    app_version: str = "0.2.0"
    data_dir: Path = Field(default_factory=_default_data_dir)
    database_url: str | None = None
    ark_api_key: str = ""
    doubao_base_url: str = "https://ark.cn-beijing.volces.com/api/v3"
    doubao_text_model: str = "doubao-seed-2-0-lite-260428"
    doubao_image_model: str = "doubao-seedream-5-0-260128"
    doubao_timeout_seconds: float = 60.0
    image_timeout_seconds: float = 120.0
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "null",
    ]
    cors_origin_regex: str = (
        r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|"
        r"172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$"
    )

    @property
    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return f"sqlite:///{(self.data_dir / 'vocabulary.db').as_posix()}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
