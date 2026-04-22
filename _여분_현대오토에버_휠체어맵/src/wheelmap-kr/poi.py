"""BF POI 로더 / 마커 포맷 변환."""

from __future__ import annotations

from dataclasses import dataclass

from data import mock_poi


@dataclass(frozen=True)
class Poi:
    """배리어프리 POI."""

    name: str
    lat: float
    lon: float
    category: str
    note: str


CATEGORY_ICON: dict[str, tuple[str, str]] = {
    "elevator": ("arrow-up", "blue"),
    "toilet": ("plus", "purple"),
    "cafe": ("coffee", "cadetblue"),
}


def load_all() -> list[Poi]:
    """전체 샘플 POI 로드."""
    return [
        Poi(name=n, lat=la, lon=lo, category=c, note=nt)
        for n, la, lo, c, nt in mock_poi.all_pois()
    ]


def icon_for(category: str) -> tuple[str, str]:
    """카테고리별 Folium 아이콘(name, color)."""
    return CATEGORY_ICON.get(category, ("info-sign", "gray"))
