"""횡단보도 잔여시간 OCR — Tesseract 기반, 미설치 시 mock 폴백.

실제 시연 이미지가 없을 때도 UX 플로우를 보여줄 수 있도록 mock 값을 제공한다.
"""

from __future__ import annotations

import logging
import re
import shutil
from dataclasses import dataclass
from pathlib import Path

from PIL import Image

logger = logging.getLogger(__name__)


MOCK_RESULT_TEXT = "보행 6초 남음"
MOCK_RESULT_SECONDS = 6


@dataclass
class CrosswalkReading:
    """횡단보도 잔여시간 판독 결과."""

    text: str
    seconds: int | None
    source: str  # "tesseract" 또는 "mock"


def read_crosswalk(image_path: str | Path | None = None) -> CrosswalkReading:
    """이미지에서 잔여시간 숫자를 추출.

    Tesseract 가 설치되어 있고 이미지가 주어지면 OCR 실행, 실패 시 mock 반환.
    """
    if image_path is None:
        return _mock()

    if not _has_tesseract():
        logger.info("Tesseract 미설치. Mock 반환.")
        return _mock()

    try:
        import pytesseract  # type: ignore[import-not-found]

        img = Image.open(image_path)
        raw = pytesseract.image_to_string(img, lang="kor+eng")
        seconds = _extract_seconds(raw)
        if seconds is None:
            return _mock()
        return CrosswalkReading(
            text=f"보행 {seconds}초 남음", seconds=seconds, source="tesseract"
        )
    except (ImportError, OSError, RuntimeError) as exc:
        logger.warning("OCR 실패, mock 반환: %s", exc)
        return _mock()


def _has_tesseract() -> bool:
    return shutil.which("tesseract") is not None


def _extract_seconds(text: str) -> int | None:
    match = re.search(r"(\d{1,2})\s*초", text)
    if match:
        return int(match.group(1))
    digits = re.findall(r"\d{1,2}", text)
    if digits:
        return int(digits[0])
    return None


def _mock() -> CrosswalkReading:
    return CrosswalkReading(
        text=MOCK_RESULT_TEXT, seconds=MOCK_RESULT_SECONDS, source="mock"
    )


__all__ = ["CrosswalkReading", "read_crosswalk", "MOCK_RESULT_TEXT"]
