"""OCR 단계 — PaddleOCR 우선, Tesseract 폴백, mock 최종.

루트 CLAUDE.md §7: 로컬 OCR만 허용. Google Vision / Azure OCR 등 클라우드 금지.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


@dataclass
class OCRLine:
    """한 줄 OCR 결과."""

    text: str
    confidence: float
    bbox: tuple[int, int, int, int]  # x1,y1,x2,y2


@dataclass
class OCRResult:
    """OCR 전체 결과."""

    backend: str
    lines: list[OCRLine]

    @property
    def full_text(self) -> str:
        return "\n".join(line.text for line in self.lines).strip()


def _try_paddleocr(image: Image.Image) -> OCRResult | None:
    try:
        from paddleocr import PaddleOCR
    except Exception:
        return None
    try:
        ocr = PaddleOCR(use_angle_cls=True, lang="korean", show_log=False)
        res = ocr.ocr(np.array(image.convert("RGB")), cls=True)
        lines: list[OCRLine] = []
        for page in res or []:
            for entry in page or []:
                box, (text, conf) = entry
                if not text:
                    continue
                xs = [p[0] for p in box]
                ys = [p[1] for p in box]
                lines.append(
                    OCRLine(
                        text=text,
                        confidence=float(conf),
                        bbox=(int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))),
                    )
                )
        if lines:
            return OCRResult(backend="paddleocr", lines=lines)
    except Exception as exc:
        logger.warning("PaddleOCR 실패: %s", exc)
    return None


def _try_tesseract(image: Image.Image) -> OCRResult | None:
    try:
        import pytesseract
    except Exception:
        return None
    try:
        raw = pytesseract.image_to_data(image, lang="kor", output_type=pytesseract.Output.DICT)
        lines: list[OCRLine] = []
        for i, text in enumerate(raw["text"]):
            if not text.strip():
                continue
            conf = raw.get("conf", ["0"])[i]
            try:
                conf_f = float(conf) / 100.0 if conf not in (None, "-1") else 0.0
            except (TypeError, ValueError):
                conf_f = 0.0
            x, y, w, h = raw["left"][i], raw["top"][i], raw["width"][i], raw["height"][i]
            lines.append(
                OCRLine(
                    text=text,
                    confidence=conf_f,
                    bbox=(x, y, x + w, y + h),
                )
            )
        if lines:
            return OCRResult(backend="tesseract", lines=lines)
    except Exception as exc:
        logger.warning("Tesseract 실패: %s", exc)
    return None


def _mock(image: Image.Image) -> OCRResult:
    """OCR 백엔드 부재 시 대표 샘플 문장을 반환 (시연용)."""
    _ = image  # 사용하지 않음
    sample = [
        "국민건강보험공단 안내문",
        "귀하의 2026년 4월 보험료는 84,720원입니다.",
        "납부 기한은 2026-05-10 까지입니다.",
        "기한 경과 시 연체 가산금이 부과될 수 있습니다.",
        "문의: 1577-1000 (평일 09:00~18:00)",
        "※ 자동이체 신청은 홈페이지 또는 지사 방문 시 가능합니다.",
    ]
    return OCRResult(
        backend="mock",
        lines=[
            OCRLine(text=t, confidence=0.99, bbox=(10, 20 + 40 * i, 600, 60 + 40 * i))
            for i, t in enumerate(sample)
        ],
    )


def run_ocr(image: Image.Image) -> OCRResult:
    """이미지에서 한국어 텍스트 추출. 실패 시 순차 폴백."""
    for attempt in (_try_paddleocr, _try_tesseract):
        result = attempt(image)
        if result is not None:
            return result
    logger.info("로컬 OCR 백엔드 부재 — mock 폴백")
    return _mock(image)


def ocr_from_path(path: Path) -> OCRResult:
    """경로에서 이미지 불러와 OCR."""
    image = Image.open(path).convert("RGB")
    return run_ocr(image)
