import httpx
from pydantic import ValidationError

from app.core.config import Settings
from app.schemas.word import GeneratedWordCard


class WordCardGenerationError(RuntimeError):
    pass


class DoubaoWordCardGenerator:
    def __init__(self, settings: Settings):
        self.api_key = settings.ark_api_key.strip()
        self.base_url = settings.doubao_base_url.rstrip("/")
        self.model = settings.doubao_text_model
        self.timeout = settings.doubao_timeout_seconds

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
                            "content": (
                                "你是为中文母语英语学习者制作词卡的专业词典编辑。只输出合法 JSON，"
                                "不要 Markdown。释义按核心程度排序，例句自然简单。词性统一写成 n.、v.、"
                                "adj.、adv.、prep. 等缩写。frequency_level 只能是重点、常用、了解、废弃。"
                                "重点=日常高频且必须掌握；常用=经常见到或使用；了解=低频但值得识别；"
                                "废弃=普通人几乎不会用到的极罕见、过时或过度专业词。"
                                "输入词已经由本地词典规范为词典原形。headword 必须逐字等于输入词，"
                                "整张词卡的释义、搭配、例句和场景都必须围绕这个原形的一般用法，不能围绕"
                                "过去式、复数等某个变体生成。inflection_type 固定写原形。common_forms "
                                "列出该原形最常用的拼写变体，不包含生僻形式。"
                                "每个常见搭配必须给中文意思和一句简洁用法说明。scenarios 写真实常用场景，"
                                "不要写容易错的地方。只有具体、能被一张图准确表示的实体名词才把 "
                                "is_visualizable 设为 true；抽象名词、动作、形容词以及难以直观表示的"
                                "概念均为 false。若可视化，image_search_query 必须是适合 Wikimedia "
                                "Commons 的具体英文实物检索词，"
                                "image_prompt 必须是无文字、无水印、主体清晰的英语教学图片提示词。"
                            ),
                        },
                        {
                            "role": "user",
                            "content": (
                                f"为英语单词 {term!r} 生成词卡。严格使用此 JSON 结构："
                                '{"headword":"词典原形","inflection_type":"输入形式类型",'
                                '"common_forms":["常见变体"],"pronunciation":"原形 IPA，不含斜杠",'
                                '"meanings":['
                                '{"part_of_speech":"n./v./adj./adv. 等","meaning":"中文核心意思"}],'
                                '"collocations":[{"phrase":"英文搭配","chinese_meaning":"中文意思",'
                                '"usage_explanation":"中文用法说明"}],'
                                '"example_sentence":"简单英文例句","example_translation":"例句中文翻译",'
                                '"scenarios":["中文常用场景"],"frequency_level":"重点|常用|了解|废弃",'
                                '"is_visualizable":true,"image_search_query":"具体英文实物检索词",'
                                '"image_prompt":"英文生图提示词"}'
                            ),
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
