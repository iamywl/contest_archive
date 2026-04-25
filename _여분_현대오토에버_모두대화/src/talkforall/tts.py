"""TTS 래퍼 — 공용 `LocalTTS` 우선, 실패 시 pyttsx3 단독 폴백.

Streamlit 에서 `st.audio` 로 재생할 수 있는 WAV bytes 를 반환한다.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

logger = logging.getLogger(__name__)

_SHARED_LIB = Path(__file__).resolve().parents[3] / "_여분_공유" / "lib"
if _SHARED_LIB.exists() and str(_SHARED_LIB) not in sys.path:
    sys.path.insert(0, str(_SHARED_LIB))

try:  # pragma: no cover
    from local_tts import LocalTTS  # type: ignore[import-not-found]
except Exception as exc:  # noqa: BLE001
    logger.warning("local_tts import 실패: %s", exc)
    LocalTTS = None  # type: ignore[assignment]


def synthesize(text: str) -> tuple[bytes, str] | None:
    """(WAV bytes, backend) 반환. 합성 실패 시 None."""
    if not text.strip():
        return None
    if LocalTTS is None:
        return None
    try:
        tts = LocalTTS(language="ko")
        result = tts.synthesize(text)
        return result.audio, result.backend
    except Exception as exc:  # noqa: BLE001
        logger.warning("TTS 합성 실패: %s", exc)
        return None


__all__ = ["synthesize"]
