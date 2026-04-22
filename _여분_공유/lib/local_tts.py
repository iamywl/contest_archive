"""로컬 TTS 어댑터 — Kokoro / Coqui XTTS / pyttsx3 통합 래퍼.

CLAUDE.md §7.2 허용 범위: Clova Voice / Google TTS API 금지, 로컬만 사용.

백엔드 우선순위:
    1. Kokoro (한국어 경량 합성, https://github.com/hexgrad/kokoro) — 우선
    2. Coqui XTTS-v2 (다국어, 제로샷 목소리 복제)
    3. pyttsx3 (OS 기본 TTS, 최후 fallback)

사용 예:
    >>> from local_tts import LocalTTS
    >>> tts = LocalTTS()
    >>> tts.synthesize_to_file("안녕하세요", "out.wav", language="ko")
    >>> audio_bytes = tts.synthesize("안녕하세요")  # bytes
"""

from __future__ import annotations

import importlib.util
import io
import logging
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

logger = logging.getLogger(__name__)


Backend = Literal["kokoro", "xtts", "pyttsx3", "auto"]


@dataclass
class TTSResult:
    """TTS 결과. 바이트·샘플레이트·백엔드 정보."""

    audio: bytes
    sample_rate: int
    backend: str


class LocalTTS:
    """로컬 TTS 래퍼. 여러 백엔드 중 가용한 것을 자동 선택.

    Args:
        backend: `"kokoro"` / `"xtts"` / `"pyttsx3"` / `"auto"`.
        voice: 백엔드별 목소리 이름 (Kokoro: `"af_bella"` 등).
        language: 기본 언어 코드 (`"ko"`, `"en"`).
        speed: 말 속도 배율 (1.0 = 표준).
    """

    def __init__(
        self,
        backend: Backend = "auto",
        voice: str | None = None,
        language: str = "ko",
        speed: float = 1.0,
    ) -> None:
        self.voice = voice
        self.language = language
        self.speed = speed
        self.backend = self._select_backend(backend)
        self._impl = self._load_impl()

    @staticmethod
    def _select_backend(preferred: Backend) -> Backend:
        if preferred != "auto":
            return preferred

        if importlib.util.find_spec("kokoro") is not None:
            return "kokoro"
        if importlib.util.find_spec("TTS") is not None:
            return "xtts"
        if importlib.util.find_spec("pyttsx3") is not None:
            return "pyttsx3"

        raise RuntimeError(
            "로컬 TTS 백엔드를 찾지 못했습니다. 다음 중 하나를 설치하세요:\n"
            "  pip install kokoro\n"
            "  pip install TTS  (Coqui XTTS)\n"
            "  pip install pyttsx3"
        )

    def _load_impl(self) -> Any:
        if self.backend == "kokoro":
            from kokoro import KPipeline  # type: ignore[import-not-found]

            lang_code = "a" if self.language.startswith("en") else "k"
            return KPipeline(lang_code=lang_code)

        if self.backend == "xtts":
            from TTS.api import TTS  # type: ignore[import-not-found]

            return TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2")

        if self.backend == "pyttsx3":
            import pyttsx3  # type: ignore[import-not-found]

            engine = pyttsx3.init()
            if self.voice:
                engine.setProperty("voice", self.voice)
            return engine

        raise ValueError(f"Unsupported backend: {self.backend}")

    def synthesize(self, text: str, *, language: str | None = None) -> TTSResult:
        """텍스트 → 오디오 바이트(WAV)."""
        lang = language or self.language

        if self.backend == "kokoro":
            return self._synthesize_kokoro(text, lang=lang)
        if self.backend == "xtts":
            return self._synthesize_xtts(text, lang=lang)
        return self._synthesize_pyttsx3(text)

    def synthesize_to_file(
        self, text: str, out_path: str | Path, *, language: str | None = None
    ) -> Path:
        """텍스트 → WAV 파일 저장. 저장된 경로 반환."""
        result = self.synthesize(text, language=language)
        out_path = Path(out_path)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_bytes(result.audio)
        return out_path

    def _synthesize_kokoro(self, text: str, *, lang: str) -> TTSResult:
        voice = self.voice or ("af_heart" if lang.startswith("en") else "kf_honey")
        generator = self._impl(text, voice=voice, speed=self.speed)

        # Kokoro yields (graphemes, phonemes, audio) tuples of 24kHz float numpy.
        audio_chunks: list[Any] = []
        for _graphemes, _phonemes, audio in generator:
            audio_chunks.append(audio)

        if not audio_chunks:
            raise RuntimeError("Kokoro produced no audio")

        import numpy as np  # lazy import

        audio_array = np.concatenate(audio_chunks)
        sample_rate = 24_000
        audio_bytes = _float_to_wav_bytes(audio_array, sample_rate)
        return TTSResult(audio=audio_bytes, sample_rate=sample_rate, backend="kokoro")

    def _synthesize_xtts(self, text: str, *, lang: str) -> TTSResult:
        import tempfile

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            self._impl.tts_to_file(
                text=text,
                file_path=tmp.name,
                language=lang,
                speaker_wav=None,
            )
            audio_bytes = Path(tmp.name).read_bytes()
        return TTSResult(audio=audio_bytes, sample_rate=24_000, backend="xtts")

    def _synthesize_pyttsx3(self, text: str) -> TTSResult:
        import tempfile

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            self._impl.save_to_file(text, tmp.name)
            self._impl.runAndWait()
            audio_bytes = Path(tmp.name).read_bytes()
        return TTSResult(audio=audio_bytes, sample_rate=22_050, backend="pyttsx3")


def _float_to_wav_bytes(audio_array: Any, sample_rate: int) -> bytes:
    """Float32 numpy 배열을 16-bit PCM WAV 바이트로 인코딩."""
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


__all__ = ["LocalTTS", "TTSResult"]
