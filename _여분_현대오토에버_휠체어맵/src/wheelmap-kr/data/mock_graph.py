"""서울 강남 근처 미니 OSM 서브셋 (수작업 샘플).

좌표는 강남역 ~ 역삼역 ~ 선릉역 구간의 대표 교차점을 근사한 값이며
데모 목적의 모의 데이터다.  각 엣지는 접근성 속성을 갖는다.

- curb_cm: 보도 단차 (cm)
- slope_pct: 경사도 (%)
- width_cm: 유효 보도 폭 (cm)
- surface: 포장 상태 ("paved" | "rough" | "stairs")
- access: "ok" | "warn" | "blocked"
"""

from __future__ import annotations

# (node_id, lat, lon, label)
NODES: list[tuple[str, float, float, str]] = [
    ("N1", 37.4979, 127.0276, "강남역 2번 출구"),
    ("N2", 37.4985, 127.0283, "강남대로 교차"),
    ("N3", 37.5002, 127.0296, "강남역 북측"),
    ("N4", 37.4996, 127.0320, "역삼동 사거리"),
    ("N5", 37.5009, 127.0360, "역삼역 1번 출구"),
    ("N6", 37.5024, 127.0400, "역삼역 북측"),
    ("N7", 37.5043, 127.0432, "선릉로 진입"),
    ("N8", 37.5045, 127.0486, "선릉역 2번 출구"),
    ("N9", 37.5018, 127.0375, "테헤란로 남측"),
    ("N10", 37.4988, 127.0340, "강남구청 방면"),
    ("N11", 37.4972, 127.0310, "우회 보도 A"),
    ("N12", 37.5001, 127.0420, "우회 보도 B"),
]

# (u, v, length_m, curb_cm, slope_pct, width_cm, surface, access)
EDGES: list[tuple[str, str, float, float, float, float, str, str]] = [
    ("N1", "N2", 110, 2, 3.0, 180, "paved", "ok"),
    ("N2", "N3", 160, 4, 4.0, 170, "paved", "ok"),
    ("N3", "N4", 230, 8, 6.0, 140, "rough", "warn"),
    ("N4", "N5", 380, 3, 3.5, 200, "paved", "ok"),
    ("N5", "N6", 350, 2, 2.5, 210, "paved", "ok"),
    ("N6", "N7", 310, 6, 5.5, 150, "rough", "warn"),
    ("N7", "N8", 470, 3, 3.0, 190, "paved", "ok"),
    ("N2", "N11", 150, 1, 2.0, 200, "paved", "ok"),
    ("N11", "N10", 260, 2, 2.5, 190, "paved", "ok"),
    ("N10", "N4", 210, 3, 3.5, 180, "paved", "ok"),
    ("N10", "N9", 240, 2, 3.0, 170, "paved", "ok"),
    ("N9", "N5", 220, 2, 3.0, 190, "paved", "ok"),
    ("N9", "N12", 390, 7, 5.0, 160, "rough", "warn"),
    ("N12", "N8", 520, 2, 3.0, 200, "paved", "ok"),
    # 수동 휠체어용 접근성 우회로 (상대적으로 완만)
    ("N5", "N7", 620, 3, 3.5, 200, "paved", "ok"),
    # 계단 구간 — 프로파일에 따라 자동 제외됨
    ("N3", "N10", 140, 20, 15.0, 100, "stairs", "blocked"),
    ("N6", "N12", 160, 18, 14.0, 110, "stairs", "blocked"),
    # 수동 휠체어에는 경고, 전동에는 통과 가능한 중간 난이도
    ("N4", "N9", 180, 5, 7.5, 130, "rough", "warn"),
    ("N7", "N12", 210, 6, 6.5, 140, "rough", "warn"),
]


def nodes() -> list[tuple[str, float, float, str]]:
    """노드 목록 반환."""
    return list(NODES)


def edges() -> list[tuple[str, str, float, float, float, float, str, str]]:
    """엣지 목록 반환."""
    return list(EDGES)
