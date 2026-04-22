"""BF 인증시설 · 공공 편의시설 샘플 POI."""

from __future__ import annotations

# (name, lat, lon, category, note)
POIS: list[tuple[str, float, float, str, str]] = [
    ("강남역 엘리베이터 (2번출구)", 37.4981, 127.0279, "elevator", "지하철 연결 EL"),
    ("역삼동 공공 장애인화장실", 37.5010, 127.0362, "toilet", "BF 인증 · 24시간"),
    ("강남구청 장애인화장실", 37.5173, 127.0473, "toilet", "BF 인증"),
    ("선릉역 엘리베이터", 37.5047, 127.0489, "elevator", "출구 ↔ 개찰구"),
    ("테헤란로 BF 카페", 37.5020, 127.0378, "cafe", "KODDI BF 인증시설"),
]


def all_pois() -> list[tuple[str, float, float, str, str]]:
    """전체 POI 반환."""
    return list(POIS)
