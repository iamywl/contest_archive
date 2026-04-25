"""심볼 시퀀스 → 자연스러운 한국어 문장 예측.

1순위: `_여분_공유/lib/local_llm.py` 의 `LocalLLM(model="aac")` — Ollama 로컬 호출.
2순위: Ollama 미구동 시 mock — 단어를 이어붙이고 "요" 어미를 붙이는 단순 폴백.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

logger = logging.getLogger(__name__)

# `_여분_공유/lib` 를 sys.path 에 얹어 공용 LLM 래퍼를 가져온다.
_SHARED_LIB = Path(__file__).resolve().parents[3] / "_여분_공유" / "lib"
if _SHARED_LIB.exists() and str(_SHARED_LIB) not in sys.path:
    sys.path.insert(0, str(_SHARED_LIB))

try:  # pragma: no cover - 환경 의존
    from local_llm import LocalLLM  # type: ignore[import-not-found]
except Exception as exc:  # noqa: BLE001
    logger.warning("local_llm import 실패, mock 폴백 사용: %s", exc)
    LocalLLM = None  # type: ignore[assignment]


SYSTEM_PROMPT = (
    "너는 AAC(보완대체의사소통) 사용자의 심볼 시퀀스를 자연스러운 한국어 문장으로"
    " 바꿔주는 도우미다. 다음 규칙을 지킨다.\n"
    "1) 주어진 단어 순서를 존중하되, 조사·어미를 자연스럽게 보정한다.\n"
    "2) 한 문장으로 답한다. 존댓말(해요/합니다) 형태를 기본으로 한다.\n"
    "3) 추가 설명·따옴표·이모지를 출력하지 않는다. 문장만 답한다."
)


def _mock_sentence(words: list[str]) -> str:
    """Ollama 미구동 시 폴백 — 단어 이어붙이고 '요' 어미."""
    if not words:
        return ""
    joined = " ".join(words).strip()
    if joined.endswith(("요", "다", "까", "죠", ".", "?", "!")):
        return joined
    return f"{joined}요."


def predict_sentence(symbol_sequence: list[dict[str, str]]) -> tuple[str, str]:
    """심볼 시퀀스 → 문장.

    Returns:
        (sentence, source). `source` 는 "llm" 또는 "mock".
    """
    words = [s.get("ko") or s.get("label", "") for s in symbol_sequence]
    words = [w for w in words if w]

    if not words:
        return "", "mock"

    if LocalLLM is None:
        return _mock_sentence(words), "mock"

    try:
        llm = LocalLLM(model="aac", system=SYSTEM_PROMPT, timeout=30.0)
        if not llm.health():
            llm.close()
            return _mock_sentence(words), "mock"

        user = "다음 심볼 시퀀스를 한국어 한 문장으로 자연스럽게 만들어줘: " + ", ".join(words)
        response = llm.chat([{"role": "user", "content": user}], temperature=0.2)
        llm.close()
        sentence = response.text.strip().splitlines()[0].strip()
        if not sentence:
            return _mock_sentence(words), "mock"
        return sentence, "llm"
    except Exception as exc:  # noqa: BLE001
        logger.warning("LLM 호출 실패, mock 폴백: %s", exc)
        return _mock_sentence(words), "mock"


__all__ = ["predict_sentence", "SYSTEM_PROMPT"]
