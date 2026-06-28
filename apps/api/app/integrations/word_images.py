import base64
import html
import re
from dataclasses import dataclass
from typing import Any
from uuid import uuid4

import httpx

from app.core.config import Settings


class WordImageError(RuntimeError):
    pass


@dataclass(frozen=True)
class WordImageResult:
    url: str
    source: str
    source_url: str = ""
    attribution: str = ""


class WordImageService:
    commons_api_url = "https://commons.wikimedia.org/w/api.php"

    def __init__(self, settings: Settings):
        self.api_key = settings.ark_api_key.strip()
        self.base_url = settings.doubao_base_url.rstrip("/")
        self.model = settings.doubao_image_model
        self.timeout = settings.image_timeout_seconds
        self.media_dir = settings.data_dir / "media"

    def find_or_generate(self, word_id: int, search_query: str, image_prompt: str) -> WordImageResult:
        self.media_dir.mkdir(parents=True, exist_ok=True)
        commons_result = self._find_commons_image(word_id, search_query)
        if commons_result is not None:
            return commons_result
        return self._generate_image(word_id, image_prompt)

    def _find_commons_image(self, word_id: int, search_query: str) -> WordImageResult | None:
        query = search_query.strip()
        if not query:
            return None
        try:
            with httpx.Client(
                timeout=min(self.timeout, 15.0),
                headers={"User-Agent": "Vocaboom/0.3 personal vocabulary learning app"},
                follow_redirects=True,
            ) as client:
                response = client.get(
                    self.commons_api_url,
                    params={
                        "action": "query",
                        "format": "json",
                        "generator": "search",
                        "gsrsearch": query,
                        "gsrnamespace": 6,
                        "gsrlimit": 8,
                        "prop": "imageinfo",
                        "iiprop": "url|mime|extmetadata",
                        "iiurlwidth": 1200,
                    },
                )
                response.raise_for_status()
                pages = response.json().get("query", {}).get("pages", {})
                for page in pages.values():
                    image_info = (page.get("imageinfo") or [{}])[0]
                    mime = image_info.get("mime", "")
                    image_url = image_info.get("thumburl") or image_info.get("url", "")
                    if mime not in {"image/jpeg", "image/png", "image/webp"} or not image_url:
                        continue
                    downloaded = client.get(image_url)
                    downloaded.raise_for_status()
                    if len(downloaded.content) > 12 * 1024 * 1024:
                        continue
                    suffix = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}[mime]
                    filename = self._save_bytes(word_id, downloaded.content, suffix)
                    metadata = image_info.get("extmetadata", {})
                    artist = self._metadata_text(metadata, "Artist")
                    license_name = self._metadata_text(metadata, "LicenseShortName")
                    attribution = " · ".join(item for item in (artist, license_name) if item)
                    return WordImageResult(
                        url=f"/media/{filename}",
                        source="wikimedia",
                        source_url=image_info.get("descriptionurl", ""),
                        attribution=attribution,
                    )
        except (httpx.HTTPError, KeyError, TypeError, ValueError):
            return None
        return None

    def _generate_image(self, word_id: int, image_prompt: str) -> WordImageResult:
        if not self.api_key:
            raise WordImageError("未配置火山方舟 API Key，无法生成图片")
        prompt = image_prompt.strip()
        if not prompt:
            raise WordImageError("豆包没有提供可用的图片提示词")
        try:
            response = httpx.post(
                f"{self.base_url}/images/generations",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "size": "2K",
                    "response_format": "b64_json",
                    "output_format": "png",
                    "watermark": False,
                },
                timeout=self.timeout,
            )
            response.raise_for_status()
            item = response.json()["data"][0]
            if item.get("b64_json"):
                content = base64.b64decode(item["b64_json"], validate=True)
            elif item.get("url"):
                downloaded = httpx.get(item["url"], timeout=self.timeout, follow_redirects=True)
                downloaded.raise_for_status()
                content = downloaded.content
            else:
                raise WordImageError("豆包生图接口没有返回图片")
            filename = self._save_bytes(word_id, content, ".png")
            return WordImageResult(
                url=f"/media/{filename}", source="doubao", attribution="豆包 Seedream 生成"
            )
        except WordImageError:
            raise
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as error:
            raise WordImageError("豆包未能生成词义图片") from error

    def _save_bytes(self, word_id: int, content: bytes, suffix: str) -> str:
        filename = f"word-{word_id}-{uuid4().hex}{suffix}"
        (self.media_dir / filename).write_bytes(content)
        return filename

    @staticmethod
    def _metadata_text(metadata: dict[str, Any], key: str) -> str:
        value = metadata.get(key, {}).get("value", "")
        return html.unescape(re.sub(r"<[^>]+>", "", str(value))).strip()
