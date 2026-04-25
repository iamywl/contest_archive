"""YOLO v8n 객체 인식 래퍼.

Ultralytics YOLO 를 로컬에서 구동해 PIL 이미지를 입력받고 감지 결과(라벨·좌표·신뢰도)와
바운딩 박스가 그려진 이미지를 반환한다. 모델은 최초 실행 시 자동 다운로드(~6MB) 된다.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger(__name__)


DEFAULT_MODEL = "yolov8n.pt"
DEFAULT_CONF = 0.35

# COCO 80 클래스 → 한국어 매핑 (시각장애 보행 관점에서 의미 있는 항목 위주).
KOREAN_LABEL: dict[str, str] = {
    "person": "사람",
    "bicycle": "자전거",
    "car": "자동차",
    "motorcycle": "오토바이",
    "bus": "버스",
    "truck": "트럭",
    "traffic light": "신호등",
    "stop sign": "정지 표지",
    "bench": "벤치",
    "backpack": "가방",
    "umbrella": "우산",
    "handbag": "핸드백",
    "suitcase": "캐리어",
    "bottle": "병",
    "chair": "의자",
    "potted plant": "화분",
    "dining table": "테이블",
    "tv": "TV",
    "laptop": "노트북",
    "cell phone": "휴대폰",
    "dog": "개",
    "cat": "고양이",
    "fire hydrant": "소화전",
    "parking meter": "주차 미터기",
    "stairs": "계단",
    "door": "문",
}


@dataclass
class Detection:
    """단일 감지 결과."""

    label_en: str
    label_ko: str
    confidence: float
    # (x1, y1, x2, y2) — 원본 이미지 좌표계, 픽셀 단위.
    bbox: tuple[int, int, int, int]

    @property
    def center_x_ratio(self) -> float:
        """이미지 가로 대비 중심 x 위치 비율 (0~1)."""
        x1, _, x2, _ = self.bbox
        return (x1 + x2) / 2.0

    @property
    def area_ratio(self) -> float:
        """바운딩 박스 면적 비율 (근접도 추정용)."""
        x1, y1, x2, y2 = self.bbox
        return max(0, (x2 - x1) * (y2 - y1))


@lru_cache(maxsize=2)
def _load_model(model_name: str) -> Any:
    """YOLO 모델 지연 로드. 프로세스당 1회만 로드."""
    from ultralytics import YOLO  # type: ignore[import-not-found]

    logger.info("YOLO 모델 로드: %s", model_name)
    return YOLO(model_name)


def run_inference(
    image: Image.Image,
    *,
    model_name: str = DEFAULT_MODEL,
    conf: float = DEFAULT_CONF,
) -> list[Detection]:
    """PIL 이미지를 추론해 감지 목록을 반환.

    Args:
        image: 입력 이미지(RGB).
        model_name: `"yolov8n.pt"` 기본. 최초 실행 시 가중치 자동 다운로드.
        conf: 신뢰도 임계값. 낮을수록 더 많이 잡힘.
    """
    model = _load_model(model_name)
    rgb = image.convert("RGB")
    np_image = np.asarray(rgb)

    results = model.predict(np_image, conf=conf, verbose=False)
    detections: list[Detection] = []
    if not results:
        return detections

    result = results[0]
    names: dict[int, str] = result.names
    boxes = getattr(result, "boxes", None)
    if boxes is None:
        return detections

    xyxy = boxes.xyxy.cpu().numpy().astype(int)
    confs = boxes.conf.cpu().numpy()
    clses = boxes.cls.cpu().numpy().astype(int)

    for (x1, y1, x2, y2), c, k in zip(xyxy, confs, clses, strict=False):
        label_en = names.get(int(k), str(k))
        label_ko = KOREAN_LABEL.get(label_en, label_en)
        detections.append(
            Detection(
                label_en=label_en,
                label_ko=label_ko,
                confidence=float(c),
                bbox=(int(x1), int(y1), int(x2), int(y2)),
            )
        )
    return detections


def draw_detections(image: Image.Image, detections: list[Detection]) -> Image.Image:
    """감지 박스와 라벨(한국어)을 그린 새 이미지 반환."""
    canvas = image.convert("RGB").copy()
    draw = ImageDraw.Draw(canvas)
    font = _load_font(size=max(16, canvas.width // 50))

    for det in detections:
        x1, y1, x2, y2 = det.bbox
        color = _color_for(det.label_en)
        draw.rectangle([(x1, y1), (x2, y2)], outline=color, width=3)

        tag = f"{det.label_ko} {det.confidence:.2f}"
        text_y = max(0, y1 - (font.size + 6))
        _draw_tag(draw, (x1, text_y), tag, font=font, color=color)

    return canvas


def _color_for(label: str) -> tuple[int, int, int]:
    """라벨별 결정적 색 (간단 해시)."""
    palette = [
        (255, 99, 71),
        (60, 179, 113),
        (65, 105, 225),
        (255, 215, 0),
        (186, 85, 211),
        (255, 140, 0),
    ]
    return palette[hash(label) % len(palette)]


def _draw_tag(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    *,
    font: ImageFont.ImageFont,
    color: tuple[int, int, int],
) -> None:
    x, y = xy
    bbox = draw.textbbox((x, y), text, font=font)
    draw.rectangle(bbox, fill=color)
    draw.text((x, y), text, fill=(255, 255, 255), font=font)


def _load_font(size: int) -> ImageFont.ImageFont:
    """시스템 한글 폰트 로드. 실패 시 기본 폰트."""
    candidates = [
        "/System/Library/Fonts/AppleSDGothicNeo.ttc",
        "/Library/Fonts/AppleGothic.ttf",
        "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
        "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size=size)
            except OSError:
                continue
    return ImageFont.load_default()


__all__ = ["Detection", "run_inference", "draw_detections", "KOREAN_LABEL"]
