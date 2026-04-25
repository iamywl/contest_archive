"""MediaPipe Holistic 기반 수어 포즈 추출기.

구성:
    - MediaPipe 설치 시: 실제 Holistic 추론으로 landmark 33개 + 손 21×2 추출.
    - 미설치 시: mock 모드로 사전 기록된 landmark 샘플을 반환.

루트 CLAUDE.md §7: 온디바이스만 허용. 프레임은 외부 전송 금지.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


@dataclass
class HolisticResult:
    """Holistic 추론 결과."""

    backend: str
    pose_landmarks: list[tuple[float, float, float]]
    left_hand: list[tuple[float, float, float]]
    right_hand: list[tuple[float, float, float]]
    face_detected: bool

    @property
    def hand_active(self) -> bool:
        return bool(self.left_hand) or bool(self.right_hand)

    @property
    def summary(self) -> str:
        parts: list[str] = []
        parts.append(f"포즈 랜드마크 {len(self.pose_landmarks)}개")
        parts.append(f"왼손 {len(self.left_hand)}개")
        parts.append(f"오른손 {len(self.right_hand)}개")
        parts.append("얼굴 인식됨" if self.face_detected else "얼굴 미인식")
        return " · ".join(parts)


def _try_mediapipe(image: Image.Image) -> HolisticResult | None:
    """MediaPipe 가용 시 실제 Holistic 추론."""
    try:
        import mediapipe as mp
    except Exception:
        return None

    try:
        array = np.array(image.convert("RGB"))
    except Exception as exc:
        logger.warning("이미지 변환 실패: %s", exc)
        return None

    with mp.solutions.holistic.Holistic(
        static_image_mode=True,
        model_complexity=1,
        enable_segmentation=False,
    ) as holistic:
        res: Any = holistic.process(array)

    def to_list(landmarks: Any) -> list[tuple[float, float, float]]:
        if landmarks is None:
            return []
        return [(lm.x, lm.y, lm.z) for lm in landmarks.landmark]

    return HolisticResult(
        backend="mediapipe",
        pose_landmarks=to_list(res.pose_landmarks),
        left_hand=to_list(res.left_hand_landmarks),
        right_hand=to_list(res.right_hand_landmarks),
        face_detected=bool(res.face_landmarks),
    )


def _mock_result(image: Image.Image) -> HolisticResult:
    """MediaPipe 부재 시 결정론적 mock. 이미지 평균 픽셀로 '손 활성' 판정."""
    try:
        array = np.array(image.convert("L"))
        mean = float(array.mean()) / 255.0
    except Exception:
        mean = 0.5

    # 평균 밝기로 왼손/오른손 흉내 (데모 전용).
    has_hand = mean > 0.2
    pose = [(0.5 + 0.01 * i, 0.4 + 0.005 * i, 0.0) for i in range(33)]
    left = [(0.35, 0.55, 0.0)] * 21 if has_hand else []
    right = [(0.65, 0.55, 0.0)] * 21 if has_hand else []

    return HolisticResult(
        backend="mock",
        pose_landmarks=pose,
        left_hand=left,
        right_hand=right,
        face_detected=True,
    )


def extract(image: Image.Image) -> HolisticResult:
    """이미지 한 장에서 Holistic 포즈를 추출. 실패 시 mock 폴백."""
    result = _try_mediapipe(image)
    if result is not None:
        return result
    logger.info("MediaPipe 부재 — mock 백엔드로 폴백")
    return _mock_result(image)


def gloss_candidate(result: HolisticResult) -> str:
    """Landmark 윤곽에서 간단한 gloss 추정.

    실제 Sign-to-Text 모델 대신 손 위치 기반 휴리스틱.
    """
    if not result.hand_active:
        return "대기"

    left_y = np.mean([lm[1] for lm in result.left_hand]) if result.left_hand else None
    right_y = np.mean([lm[1] for lm in result.right_hand]) if result.right_hand else None

    candidates: list[str] = []
    if left_y is not None and left_y < 0.4:
        candidates.append("인사")
    if right_y is not None and right_y < 0.4:
        candidates.append("인사")
    if right_y is not None and 0.5 < right_y < 0.7:
        candidates.append("감사")
    if left_y is not None and left_y > 0.6:
        candidates.append("아픔")

    if not candidates:
        return "일반 대화"
    return candidates[0]
