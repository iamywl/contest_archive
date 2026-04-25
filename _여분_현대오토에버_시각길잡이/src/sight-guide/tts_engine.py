"""로컬 TTS 래퍼 (pyttsx3 우선, Kokoro fallback).

CLAUDE.md §7.2 준수: 클라우드 TTS(Clova / Google TTS 등) 사용 금지.
오프라인 환경에서 네트워크 없이 음성 합성이 가능해야 한다.
"""

from __future__ import annotations

import importlib.util
import io
import logging
import tempfile
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class TTSResult:
    """합성 결과."""

    audio: bytes
    sample_rate: int
    backend: str


class LocalTTSEngine:
    """pyttsx3 우선, Kokoro 가용 시 자동 승급.

    Args:
        prefer: `"pyttsx3"` / `"kokoro"` / `"auto"`.
        language: 기본 언어 `"ko"`.
        rate: pyttsx3 속도 (기본 ~200).
    """

    def __init__(
        self,
        prefer: str = "auto",
        language: str = "ko",
        rate: int = 180,
    ) -> None:
        self.language = language
        self.rate = rate
        self.backend = self._pick_backend(prefer)
        self._impl = self._init_impl()

    @staticmethod
    def _pick_backend(prefer: str) -> str:
        if prefer == "kokoro" and importlib.util.find_spec("kokoro") is not None:
            return "kokoro"
        if prefer == "pyttsx3" and importlib.util.find_spec("pyttsx3") is not None:
            return "pyttsx3"
        # auto
        if importlib.util.find_spec("kokoro") is not None:
            return "kokoro"
        if importlib.util.find_spec("pyttsx3") is not None:
            return "pyttsx3"
        raise RuntimeError(
            "로컬 TTS 백엔드가 설치되어 있지 않습니다. "
            "`pip install pyttsx3` 또는 `pip install kokoro` 하세요."
        )

    def _init_impl(self) -> Any:
        if self.backend == "pyttsx3":
            import pyttsx3  # type: ignore[import-not-found]

            engine = pyttsx3.init()
            engine.setProperty("rate", self.rate)
            return engine
        if self.backend == "kokoro":
            from kokoro import KPipeline  # type: ignore[import-not-found]

            lang_code = "k" if self.language.startswith("ko") else "a"
            return KPipeline(lang_code=lang_code)
        raise ValueError(f"Unsupported backend: {self.backend}")

    def synthesize(self, text: str) -> TTSResult:
        """텍스트 → WAV 바이트."""
        if self.backend == "pyttsx3":
            return self._pyttsx3(text)
        return self._kokoro(text)

    def _pyttsx3(self, text: str) -> TTSResult:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            out_path = Path(tmp.name)
        try:
            self._impl.save_to_file(text, str(out_path))
            self._impl.runAndWait()
            audio = out_path.read_bytes()
        finally:
            try:
                out_path.unlink()
            except OSError:
                pass
        return TTSResult(audio=audio, sample_rate=22_050, backend="pyttsx3")

    def _kokoro(self, text: str) -> TTSResult:
        import numpy as np  # lazy import

        voice = "kf_honey" if self.language.startswith("ko") else "af_heart"
        chunks: list[np.ndarray] = []
        for _g, _p, audio in self._impl(text, voice=voice, speed=1.0):
            chunks.append(audio)
        if not chunks:
            raise RuntimeError("Kokoro produced no audio")
        audio_array = np.concatenate(chunks)
        sample_rate = 24_000
        wav_bytes = _float_to_wav(audio_array, sample_rate)
        return TTSResult(audio=wav_bytes, sample_rate=sample_rate, backend="kokoro")


def _float_to_wav(audio_array: Any, sample_rate: int) -> bytes:
    import numpy as np  # lazy import

    clipped = np.clip(audio_array, -1.0, 1.0)
    pcm = (clipped * 32767.0).astype("<i2").tobytes()
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(pcm)
    return buffer.getvalue()


__all__ = ["LocalTTSEngine", "TTSResult"]
