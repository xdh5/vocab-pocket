from pathlib import Path

import httpx
from pydantic import ValidationError

from app.core.config import Settings
from app.schemas.word import GeneratedWordCard

PROMPT_FILE = next(
    candidate
    for parent in Path(__file__).resolve().parents
    if (candidate := parent / "prompt" / "prompt.md").exists()
)
WORD_CARD_PROMPT = PROMPT_FILE.read_text(encoding="utf-8")


class WordCardGenerationError(RuntimeError):
    pass


class QwenWordCardGenerator:
    def __init__(self, settings: Settings):
        self.api_key = settings.qwen_api_key.strip()
        self.base_url = settings.qwen_base_url.rstrip("/")
        self.model = settings.qwen_model.strip()
        self.timeout = settings.qwen_timeout_seconds

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    def generate(self, term: str) -> GeneratedWordCard:
        if not self.is_configured:
            raise WordCardGenerationError("火山方舟 API Key 尚未配置")

        try:
            response = httpx.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "thinking": {"type": "disabled"},
                    "messages": [
                        {
                            "role": "system",
                            "content": WORD_CARD_PROMPT,
                        },
                        {
                            "role": "user",
                            "content": f"为英语单词 {term!r} 生成词卡。",
                        },
                    ],
                    "response_format": {"type": "json_object"},
                    "max_tokens": 1400,
                },
                timeout=self.timeout,
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            if not content:
                raise WordCardGenerationError("豆包返回了空内容")
            return GeneratedWordCard.model_validate_json(content)
        except WordCardGenerationError:
            raise
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError, ValidationError) as error:
            raise WordCardGenerationError("豆包未能生成有效词卡") from error
