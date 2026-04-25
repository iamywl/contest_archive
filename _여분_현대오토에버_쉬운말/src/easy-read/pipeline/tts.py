"""TTS — Kokoro 우선, pyttsx3 폴백, 마지막은 텍스트-only 안내."""

from __future__ import annotations

import logging
import tempfile
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class TTSResult:
    """음성 합성 결과."""

    backend: str
    wav_path: Path | None
    note: str = ""


def _try_kokoro(text: str) -> TTSResult | None:
    try:
        from kokoro import KPipeline
    except Exception:
        return None
    try:
        pipeline = KPipeline(lang_code="k")
        audio_chunks = list(pipeline(text))
        if not audio_chunks:
            return None
        import soundfile as sf  # type: ignore[import-untyped]

        tmp = Path(tempfile.gettempdir()) / "easyread_tts.wav"
        sf.write(str(tmp), audio_chunks[0].audio, 24_000)
        return TTSResult(backend="kokoro", wav_path=tmp)
    except Exception as exc:
        logger.warning("Kokoro 실패: %s", exc)
        return None


def _try_pyttsx3(text: str) -> TTSResult | None:
    try:
        import pyttsx3
    except Exception:
        return None
    try:
        engine = pyttsx3.init()
        tmp = Path(tempfile.gettempdir()) / "easyread_pyttsx3.wav"
        engine.save_to_file(text, str(tmp))
        engine.runAndWait()
        if tmp.exists():
            return TTSResult(backend="pyttsx3", wav_path=tmp)
    except Exception as exc:
        logger.warning("pyttsx3 실패: %s", exc)
    return None


def synthesize(text: str) -> TTSResult:
    """텍스트 → WAV. 로컬 백엔드가 전무하면 note 만 반환."""
    for attempt in (_try_kokoro, _try_pyttsx3):
        result = attempt(text)
        if result is not None:
            return result
    return TTSResult(
        backend="none",
        wav_path=None,
        note="로컬 TTS 미설치. `pip install pyttsx3` 또는 `pip install kokoro`.",
    )
