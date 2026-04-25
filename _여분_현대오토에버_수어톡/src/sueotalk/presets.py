"""관공서·병원·응대 상황 프리셋.

심사 시연에서 "번호표 뽑았어요 → 창구가 어디인가요 → 보험증 있어요"
같은 연속 문장을 버튼 1~3개로 재현하기 위한 용도.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ScenarioPreset:
    """상황 프리셋."""

    name: str
    icon: str
    description: str
    sentence_ids: tuple[int, ...]


SCENARIOS: list[ScenarioPreset] = [
    ScenarioPreset(
        name="주민센터 접수",
        icon="🏛️",
        description="번호표 → 창구 확인 → 등본 발급까지",
        sentence_ids=(21, 22, 16, 30),
    ),
    ScenarioPreset(
        name="병원 접수",
        icon="🏥",
        description="예약 확인 → 보험증 → 증상 설명",
        sentence_ids=(13, 14, 7, 10),
    ),
    ScenarioPreset(
        name="약국",
        icon="💊",
        description="처방전 전달 → 약 설명 확인",
        sentence_ids=(15, 12, 24),
    ),
    ScenarioPreset(
        name="은행 창구",
        icon="🏦",
        description="입금 / 출금 / 통장 개설",
        sentence_ids=(51, 52, 53, 54),
    ),
    ScenarioPreset(
        name="긴급 상황",
        icon="🚨",
        description="119 신고 · 사고 · 길 잃음",
        sentence_ids=(41, 42, 45, 40),
    ),
    ScenarioPreset(
        name="교통·길안내",
        icon="🚌",
        description="지하철 · 버스 · 택시",
        sentence_ids=(37, 38, 39, 31),
    ),
]
