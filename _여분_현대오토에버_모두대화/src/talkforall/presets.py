"""상황 프리셋 정의 (병원·학교·관공서·가족) — 각 프리셋별 심볼 그리드 카테고리 매핑.

`data/symbols.json` 로부터 로드된 심볼 풀(pool)을 프리셋 키로 필터링한다.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

DATA_PATH = Path(__file__).parent / "data" / "symbols.json"


@dataclass(frozen=True)
class Preset:
    key: str
    title: str
    emoji: str
    description: str


PRESETS: list[Preset] = [
    Preset("hospital", "병원", "🏥", "통증·진료·약 어휘"),
    Preset("school", "학교", "🏫", "수업·친구·식사 어휘"),
    Preset("office", "관공서", "🏛️", "민원·신분증·대기 어휘"),
    Preset("family", "가족", "👪", "일상·감정·요청 어휘"),
]


def preset_by_key(key: str) -> Preset:
    for preset in PRESETS:
        if preset.key == key:
            return preset
    raise KeyError(f"unknown preset: {key}")


def load_symbols() -> dict[str, list[dict[str, str]]]:
    """`data/symbols.json` 로드. 각 프리셋 키 → 심볼 리스트."""
    if not DATA_PATH.exists():
        return {}
    with DATA_PATH.open("r", encoding="utf-8") as fp:
        return json.load(fp)


def symbols_for(preset_key: str) -> list[dict[str, str]]:
    pool = load_symbols()
    return pool.get(preset_key, [])


__all__ = ["Preset", "PRESETS", "preset_by_key", "load_symbols", "symbols_for"]
