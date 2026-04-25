"""로컬 STT 러너.

우선순위:
    1. faster-whisper (large-v3) — 로컬 GPU/CPU 모두 지원
    2. whisper.cpp CLI — 외부 바이너리
    3. mock 모드 — 업로드 파일명에서 프리셋 ID 추정

루트 CLAUDE.md §7: OpenAI Whisper API 금지. 로컬 whisper.cpp / faster-whisper / MLX Whisper만 허용.
"""

from __future__ import annotations

import logging
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class STTResult:
    """STT 결과."""

    text: str
    backend: str
    duration_seconds: float


def _try_faster_whisper(audio_path: Path, model_size: str) -> STTResult | None:
    try:
        from faster_whisper import WhisperModel
    except Exception:
        return None

    try:
        model = WhisperModel(model_size, device="auto", compute_type="int8")
        segments, _info = model.transcribe(str(audio_path), language="ko", beam_size=1)
        text = " ".join(seg.text.strip() for seg in segments).strip()
        return STTResult(text=text, backend=f"faster-whisper ({model_size})", duration_seconds=0.0)
    except Exception as exc:
        logger.warning("faster-whisper 실패: %s", exc)
        return None


def _try_whisper_cpp(audio_path: Path) -> STTResult | None:
    binary = shutil.which("whisper-cpp") or shutil.which("whisper")
    if not binary:
        return None
    try:
        result = subprocess.run(
            [binary, "-f", str(audio_path), "-l", "ko", "-otxt"],
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        if result.returncode != 0:
            logger.warning("whisper-cpp 비정상 종료: %s", result.stderr[:200])
            return None
        text = result.stdout.strip()
        return STTResult(text=text, backend="whisper.cpp", duration_seconds=0.0)
    except Exception as exc:
        logger.warning("whisper-cpp 실행 실패: %s", exc)
        return None


def _mock_from_filename(audio_path: Path) -> STTResult:
    """파일명에 포함된 한국어 또는 ID를 그대로 텍스트로 사용."""
    stem = audio_path.stem
    return STTResult(
        text=f"[mock] {stem}",
        backend="mock (파일명 추정)",
        duration_seconds=0.0,
    )


def transcribe(audio_path: Path, model_size: str = "small") -> STTResult:
    """오디오 파일을 한국어 텍스트로 전사. 실패 시 mock 폴백."""
    for attempt in (_try_faster_whisper, _try_whisper_cpp):
        result = attempt(audio_path, model_size) if attempt is _try_faster_whisper else attempt(audio_path)  # type: ignore[arg-type]
        if result is not None:
            return result
    logger.info("로컬 STT 백엔드 부재 — mock 폴백")
    return _mock_from_filename(audio_path)
