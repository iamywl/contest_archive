"""로컬 LLM 어댑터 — Ollama HTTP 클라이언트.

저장소 루트 CLAUDE.md §7 준수: API 기반 AI(Anthropic/OpenAI 등) 금지, 로컬만 허용.
기본 백엔드: Ollama (http://localhost:11434).

모델 alias:
    "chat"     → llama3.3:70b-instruct-q4_K_M  (범용 대화/Tool-use)
    "ko"       → qwen2.5:32b-instruct-q4_K_M   (한국어 특화)
    "large"    → devstral-2:123b               (긴 컨텍스트/복잡 추론)
    "small"    → qwen2.5:7b-instruct-q4_K_M    (빠른 분류/경량)
    "aac"      → gemma3:27b-instruct-q4_K_M    (한국어 조사·어미)
    "embed"    → nomic-embed-text              (임베딩)

JSON 스키마 강제 출력은 Ollama의 `format="json"` 옵션을 기본 활용하고,
엄격한 스키마 제약이 필요하면 `outlines` 또는 `llama.cpp grammar` 병행.

사용 예:
    >>> from local_llm import LocalLLM
    >>> llm = LocalLLM(model="ko")
    >>> llm.chat([{"role": "user", "content": "안녕"}]).text
    '안녕하세요! 무엇을 도와드릴까요?'
    >>> llm.chat_json([...], schema={"type": "object", ...})
    {'intent': 'greeting', ...}
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from typing import Any, Iterator

import httpx

logger = logging.getLogger(__name__)

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")

MODEL_ALIAS: dict[str, str] = {
    "chat": "llama3.3:70b-instruct-q4_K_M",
    "ko": "qwen2.5:32b-instruct-q4_K_M",
    "large": "devstral-2:123b",
    "small": "qwen2.5:7b-instruct-q4_K_M",
    "aac": "gemma3:27b-instruct-q4_K_M",
    "embed": "nomic-embed-text",
}


@dataclass
class ChatResponse:
    """Ollama /api/chat 응답 래퍼."""

    text: str
    model: str
    total_duration_ms: int
    prompt_eval_count: int
    eval_count: int

    @property
    def tokens_per_second(self) -> float:
        if self.total_duration_ms <= 0:
            return 0.0
        return self.eval_count / (self.total_duration_ms / 1000.0)


class LocalLLM:
    """Ollama 로컬 LLM 래퍼.

    Args:
        model: MODEL_ALIAS 키(`"chat"`, `"ko"` 등) 또는 모델 풀네임.
        host: Ollama 서버 URL. 기본값은 환경변수 OLLAMA_HOST 또는 localhost:11434.
        timeout: HTTP 타임아웃 초. 로컬 대형 모델은 긴 생성 시간을 허용.
        system: 시스템 프롬프트. 모든 chat 호출 선두에 주입.
    """

    def __init__(
        self,
        model: str = "chat",
        host: str = OLLAMA_HOST,
        timeout: float = 300.0,
        system: str | None = None,
    ) -> None:
        self.model = MODEL_ALIAS.get(model, model)
        self.host = host.rstrip("/")
        self.timeout = timeout
        self.system = system
        self._client = httpx.Client(base_url=self.host, timeout=timeout)

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> LocalLLM:
        return self

    def __exit__(self, *_exc: object) -> None:
        self.close()

    def _build_messages(self, messages: list[dict[str, str]]) -> list[dict[str, str]]:
        if self.system and not (messages and messages[0].get("role") == "system"):
            return [{"role": "system", "content": self.system}, *messages]
        return messages

    def chat(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.2,
        num_ctx: int | None = None,
    ) -> ChatResponse:
        """동기 chat. 전체 응답을 한 번에 반환."""
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": self._build_messages(messages),
            "stream": False,
            "options": {"temperature": temperature},
        }
        if num_ctx is not None:
            payload["options"]["num_ctx"] = num_ctx

        response = self._client.post("/api/chat", json=payload)
        response.raise_for_status()
        data = response.json()
        return ChatResponse(
            text=data["message"]["content"],
            model=data.get("model", self.model),
            total_duration_ms=data.get("total_duration", 0) // 1_000_000,
            prompt_eval_count=data.get("prompt_eval_count", 0),
            eval_count=data.get("eval_count", 0),
        )

    def chat_stream(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.2,
    ) -> Iterator[str]:
        """스트리밍 chat. 토큰 단위 문자열 yield."""
        payload = {
            "model": self.model,
            "messages": self._build_messages(messages),
            "stream": True,
            "options": {"temperature": temperature},
        }
        with self._client.stream("POST", "/api/chat", json=payload) as response:
            response.raise_for_status()
            for line in response.iter_lines():
                if not line:
                    continue
                chunk = json.loads(line)
                if content := chunk.get("message", {}).get("content"):
                    yield content
                if chunk.get("done"):
                    break

    def chat_json(
        self,
        messages: list[dict[str, str]],
        *,
        schema: dict[str, Any] | None = None,
        temperature: float = 0.1,
    ) -> dict[str, Any]:
        """JSON 스키마 강제 출력.

        Ollama `format="json"` 으로 유효한 JSON만 반환되게 하되,
        스키마 세부 강제(필수 필드·enum)는 프롬프트에 명시한다.
        엄격 제약이 필요하면 outlines 또는 grammar 옵션을 호출부에서 병행한다.
        """
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": self._build_messages(messages),
            "stream": False,
            "format": "json",
            "options": {"temperature": temperature},
        }
        response = self._client.post("/api/chat", json=payload)
        response.raise_for_status()
        raw = response.json()["message"]["content"]
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError(f"LLM returned invalid JSON: {raw[:200]}") from exc

        if schema is not None:
            _validate_against_schema(parsed, schema)
        return parsed

    def embed(self, text: str | list[str]) -> list[list[float]]:
        """임베딩 생성. 기본 모델: nomic-embed-text."""
        model_name = MODEL_ALIAS["embed"]
        inputs = [text] if isinstance(text, str) else list(text)
        vectors: list[list[float]] = []
        for chunk in inputs:
            response = self._client.post(
                "/api/embeddings", json={"model": model_name, "prompt": chunk}
            )
            response.raise_for_status()
            vectors.append(response.json()["embedding"])
        return vectors

    def health(self) -> bool:
        """Ollama 서버 생존 체크."""
        try:
            response = self._client.get("/api/tags")
            return response.status_code == 200
        except httpx.HTTPError:
            return False


def _validate_against_schema(data: Any, schema: dict[str, Any]) -> None:
    """Minimal schema check — 필수 필드·타입 일부만 점검.

    완전한 검증은 jsonschema 라이브러리에 위임할 수 있지만
    공용 코드의 의존성 최소화를 위해 경량 체크만 수행한다.
    """
    if schema.get("type") == "object":
        if not isinstance(data, dict):
            raise ValueError(f"Expected object, got {type(data).__name__}")
        for field in schema.get("required", []):
            if field not in data:
                raise ValueError(f"Missing required field: {field}")


__all__ = ["LocalLLM", "ChatResponse", "MODEL_ALIAS", "OLLAMA_HOST"]
