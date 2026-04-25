"""픽토그램 매칭 — 로컬 ARASAAC 세트 기준.

프로젝트 단계에서는 SVG 원본 자산이 아직 번들되지 않았으므로 emoji 폴백을 기본으로 한다.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "pictogram_map.json"
ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets" / "arasaac"


@dataclass(frozen=True)
class Pictogram:
    """픽토그램 한 장."""

    keyword: str
    arasaac_id: int
    emoji: str

    @property
    def local_path(self) -> Path:
        return ASSETS_DIR / f"{self.arasaac_id}.svg"

    @property
    def has_asset(self) -> bool:
        return self.local_path.exists()


@lru_cache(maxsize=1)
def load_mapping() -> dict[str, Pictogram]:
    with DATA_PATH.open("r", encoding="utf-8") as f:
        raw = json.load(f)
    mapping: dict[str, Pictogram] = {}
    for keyword, meta in raw.get("mapping", {}).items():
        mapping[keyword] = Pictogram(
            keyword=keyword,
            arasaac_id=int(meta.get("id", 0)),
            emoji=str(meta.get("emoji", "🟦")),
        )
    return mapping


def lookup(keyword: str) -> Pictogram | None:
    return load_mapping().get(keyword)


def match_keywords(keywords: list[str]) -> list[Pictogram]:
    """문자열 리스트 → 픽토그램 리스트 (매칭 실패 시 제외)."""
    result: list[Pictogram] = []
    seen: set[str] = set()
    for kw in keywords:
        pic = lookup(kw)
        if pic is None or pic.keyword in seen:
            continue
        seen.add(pic.keyword)
        result.append(pic)
    return result
