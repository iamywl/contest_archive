"""로컬 STT 어댑터 — whisper.cpp / MLX Whisper 통합 래퍼.

CLAUDE.md §7.2 준수: OpenAI Whisper API 금지. 로컬 구현만 사용.

백엔드 우선순위:
    1. MLX Whisper (Apple Silicon Metal 가속) — M4 Max에서 최속.
    2. faster-whisper (CTranslate2 기반) — 범용 환경에서 빠름.
    3. whisper.cpp CLI — 시스템에 `whisper-cli` 설치 시 fallback.

사용 예:
    >>> from local_stt import LocalSTT
    >>> stt = LocalSTT(model="large-v3")
    >>> result = stt.transcribe("path/to/audio.wav", language="ko")
    >>> result.text
    '안녕하세요 ...'

의존성 (택1):
    pip install mlx-whisper        # Apple Silicon 권장
    pip install faster-whisper     # CTranslate2
    brew install whisper-cpp       # CLI fallback
"""

from __future__ import annotations

import importlib.util
import logging
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

logger = logging.getLogger(__name__)


ModelSize = Literal["tiny", "base", "small", "medium", "large-v3"]
Backend = Literal["mlx", "faster", "whispercpp", "auto"]


@dataclass
class TranscriptSegment:
    """단일 세그먼트(시간대별 자막 단위)."""

    start: float
    end: float
    text: str


@dataclass
class TranscriptResult:
    """STT 최종 결과."""

    text: str
    language: str
    segments: list[TranscriptSegment] = field(default_factory=list)
    backend: str = ""


class LocalSTT:
    """로컬 STT 래퍼. 여러 백엔드 중 가용한 것을 자동 선택.

    Args:
        model: whisper 모델 크기. 한국어는 `"large-v3"` 권장, 경량 환경은 `"small"`.
        backend: 백엔드 강제 지정 (`"mlx"` / `"faster"` / `"whispercpp"` / `"auto"`).
        model_dir: 커스텀 모델 경로 (선택).
    """

    def __init__(
        self,
        model: ModelSize = "large-v3",
        backend: Backend = "auto",
        model_dir: str | Path | None = None,
    ) -> None:
        self.model = model
        self.model_dir = str(model_dir) if model_dir else None
        self.backend = self._select_backend(backend)
        self._impl = self._load_impl()

    @staticmethod
    def _select_backend(preferred: Backend) -> Backend:
        if preferred != "auto":
            return preferred

        if importlib.util.find_spec("mlx_whisper") is not None:
            return "mlx"
        if importlib.util.find_spec("faster_whisper") is not None:
            return "faster"
        if shutil.which("whisper-cli") or shutil.which("whisper-cpp"):
            return "whispercpp"

        raise RuntimeError(
            "로컬 STT 백엔드를 찾지 못했습니다. 다음 중 하나를 설치하세요:\n"
            "  pip install mlx-whisper   (Apple Silicon)\n"
            "  pip install faster-whisper\n"
            "  brew install whisper-cpp"
        )

    def _load_impl(self) -> Any:
        if self.backend == "mlx":
            import mlx_whisper  # type: ignore[import-not-found]

            return mlx_whisper
        if self.backend == "faster":
            from faster_whisper import WhisperModel  # type: ignore[import-not-found]

            return WhisperModel(self.model, device="auto", compute_type="auto")
        if self.backend == "whispercpp":
            return None  # CLI에만 의존
        raise ValueError(f"Unsupported backend: {self.backend}")

    def transcribe(
        self,
        audio_path: str | Path,
        *,
        language: str = "ko",
        beam_size: int = 5,
    ) -> TranscriptResult:
        """오디오 파일을 텍스트로 변환."""
        audio_path = Path(audio_path)
        if not audio_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        if self.backend == "mlx":
            return self._transcribe_mlx(audio_path, language=language)
        if self.backend == "faster":
            return self._transcribe_faster(
                audio_path, language=language, beam_size=beam_size
            )
        return self._transcribe_whispercpp(audio_path, language=language)

    def _transcribe_mlx(self, audio_path: Path, *, language: str) -> TranscriptResult:
        # mlx_whisper.transcribe returns dict with keys: text, language, segments
        kwargs: dict[str, Any] = {"language": language}
        if self.model_dir:
            kwargs["path_or_hf_repo"] = self.model_dir
        else:
            kwargs["path_or_hf_repo"] = f"mlx-community/whisper-{self.model}-mlx"

        result = self._impl.transcribe(str(audio_path), **kwargs)
        segments = [
            TranscriptSegment(
                start=float(seg["start"]),
                end=float(seg["end"]),
                text=str(seg["text"]).strip(),
            )
            for seg in result.get("segments", [])
        ]
        return TranscriptResult(
            text=str(result.get("text", "")).strip(),
            language=str(result.get("language", language)),
            segments=segments,
            backend="mlx",
        )

    def _transcribe_faster(
        self, audio_path: Path, *, language: str, beam_size: int
    ) -> TranscriptResult:
        segments_iter, info = self._impl.transcribe(
            str(audio_path), language=language, beam_size=beam_size
        )
        segments = [
            TranscriptSegment(start=s.start, end=s.end, text=s.text.strip())
            for s in segments_iter
        ]
        return TranscriptResult(
            text=" ".join(s.text for s in segments).strip(),
            language=info.language or language,
            segments=segments,
            backend="faster",
        )

    def _transcribe_whispercpp(
        self, audio_path: Path, *, language: str
    ) -> TranscriptResult:
        binary = shutil.which("whisper-cli") or shutil.which("whisper-cpp")
        if binary is None:
            raise RuntimeError("whisper-cpp binary not found on PATH")

        cmd = [
            binary,
            "-l",
            language,
            "-m",
            self.model_dir or f"models/ggml-{self.model}.bin",
            "-f",
            str(audio_path),
            "-otxt",
            "-of",
            "-",
        ]
        proc = subprocess.run(cmd, check=True, capture_output=True, text=True)
        text = proc.stdout.strip()
        return TranscriptResult(
            text=text, language=language, segments=[], backend="whispercpp"
        )


__all__ = ["LocalSTT", "TranscriptResult", "TranscriptSegment"]
