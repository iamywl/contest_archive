"""감지 결과 → 한국어 음성 안내문 변환 규칙.

시각장애인 보행 관점에서 "어느 방향에 무엇이 몇 개 있는가"를 간결한 문장으로 요약한다.
규칙 기반 템플릿이며, 향후 LLM 기반 자연어 생성으로 교체 가능하다.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass

from detection import Detection

# 근접도 추정: 바운딩 박스 면적이 이미지의 이 비율을 넘으면 '가까움'.
NEAR_AREA_RATIO = 0.08

# 위험 가중치 (높을수록 우선 언급).
DANGER_WEIGHT: dict[str, int] = {
    "car": 5,
    "bus": 5,
    "truck": 5,
    "motorcycle": 4,
    "bicycle": 3,
    "person": 2,
    "stairs": 4,
    "fire hydrant": 2,
    "stop sign": 3,
    "traffic light": 3,
}


@dataclass
class GuidanceSentence:
    """안내 문장 + 원천 감지 메타."""

    text: str
    severity: int  # 0 정보 / 1 주의 / 2 위험


def direction_ko(center_x_ratio: float, image_width: int) -> str:
    """중심 x 비율 → 왼쪽/정면/오른쪽."""
    ratio = center_x_ratio / max(1, image_width)
    if ratio < 0.33:
        return "왼쪽"
    if ratio > 0.67:
        return "오른쪽"
    return "정면"


def build_guidance(
    detections: list[Detection],
    *,
    image_width: int,
    image_height: int,
) -> list[GuidanceSentence]:
    """감지 목록을 한국어 안내 문장 리스트로 변환."""
    if not detections:
        return [
            GuidanceSentence(
                text="전방에 감지된 장애물이 없습니다. 직진 가능합니다.",
                severity=0,
            )
        ]

    image_area = max(1, image_width * image_height)

    # (방향, 라벨) 로 그룹화.
    grouped: dict[tuple[str, str, str], list[Detection]] = {}
    for det in detections:
        direction = direction_ko(det.center_x_ratio, image_width)
        nearness = "가까이" if det.area_ratio / image_area >= NEAR_AREA_RATIO else "전방"
        key = (direction, nearness, det.label_ko)
        grouped.setdefault(key, []).append(det)

    sentences: list[GuidanceSentence] = []
    for (direction, nearness, label_ko), dets in grouped.items():
        count = len(dets)
        max_conf = max(d.confidence for d in dets)
        label_en = dets[0].label_en
        severity = _severity_for(label_en, nearness)

        noun = _count_noun(label_ko, count)
        text = f"{direction} {nearness}에 {noun} ({max_conf * 100:.0f}%)"
        sentences.append(GuidanceSentence(text=text, severity=severity))

    # 위험 가중치 내림차순, 같으면 방향 우선순위 정면→왼쪽→오른쪽.
    direction_rank = {"정면": 0, "왼쪽": 1, "오른쪽": 2}
    sentences.sort(
        key=lambda s: (-s.severity, direction_rank.get(s.text.split()[0], 3))
    )
    return sentences


def summarize(
    detections: list[Detection], *, image_width: int, image_height: int
) -> str:
    """가장 중요한 안내문만 하나의 문장으로 결합."""
    sentences = build_guidance(
        detections, image_width=image_width, image_height=image_height
    )
    if not sentences:
        return "주변 정보를 확인할 수 없습니다."
    # 상위 3개만 음성으로 읽음 (과다 정보 방지).
    top = sentences[:3]
    joined = ", ".join(s.text for s in top)
    # 위험도 있으면 경고어 추가.
    if top[0].severity >= 2:
        return f"주의, {joined}."
    return f"{joined}."


def count_summary(detections: list[Detection]) -> str:
    """간단 집계: '사람 1명, 자동차 2대' 형태."""
    if not detections:
        return "감지된 객체 없음"
    counter = Counter(d.label_ko for d in detections)
    parts = [f"{label} {_count_unit(label, c)}" for label, c in counter.most_common()]
    return ", ".join(parts)


def _severity_for(label_en: str, nearness: str) -> int:
    weight = DANGER_WEIGHT.get(label_en, 1)
    if nearness == "가까이":
        weight += 1
    if weight >= 5:
        return 2
    if weight >= 3:
        return 1
    return 0


def _count_noun(label_ko: str, count: int) -> str:
    return f"{label_ko} {_count_unit(label_ko, count)}"


def _count_unit(label_ko: str, count: int) -> str:
    """한국어 조수사. 단순화: 사람=명, 동물=마리, 그 외=개."""
    if label_ko in {"사람"}:
        return f"{count}명"
    if label_ko in {"개", "고양이"}:
        return f"{count}마리"
    if label_ko in {"자동차", "버스", "트럭", "오토바이", "자전거"}:
        return f"{count}대"
    return f"{count}개"


__all__ = [
    "GuidanceSentence",
    "build_guidance",
    "summarize",
    "count_summary",
    "direction_ko",
]
