"""한국수어(KSL) 500문장 프리셋 사전.

루트 CLAUDE.md §7 준수: 모든 매칭은 로컬 파일 기반. 외부 API 호출 없음.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


DATA_PATH = Path(__file__).parent / "data" / "ksl_500.json"


@dataclass(frozen=True)
class KSLEntry:
    """한국수어 프리셋 엔트리."""

    id: int
    category: str
    ko: str
    gloss: str
    hand: str

    @property
    def tokens(self) -> list[str]:
        """검색용 토큰(한국어 2-gram + gloss)."""
        base = re.sub(r"[^\w\s]", " ", self.ko).strip()
        ngrams: list[str] = []
        for word in base.split():
            if len(word) <= 2:
                ngrams.append(word)
                continue
            for i in range(len(word) - 1):
                ngrams.append(word[i : i + 2])
        ngrams.extend(self.gloss.split("+"))
        return ngrams


@lru_cache(maxsize=1)
def load_dictionary(path: Path | None = None) -> list[KSLEntry]:
    """JSON 데이터셋 로드 후 KSLEntry 리스트 반환."""
    target = path or DATA_PATH
    with target.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return [KSLEntry(**row) for row in data.get("sentences", [])]


def categories() -> list[str]:
    """사전에 등록된 카테고리 목록."""
    seen: list[str] = []
    for e in load_dictionary():
        if e.category not in seen:
            seen.append(e.category)
    return seen


def filter_by_category(category: str) -> list[KSLEntry]:
    """단일 카테고리 필터."""
    return [e for e in load_dictionary() if e.category == category]


def search(query: str, top_k: int = 5) -> list[tuple[KSLEntry, float]]:
    """한국어 질의어로 프리셋을 검색.

    2-gram 교집합 스코어 + 정확 매칭 가점. 모델 없이도 동작하는 베이스라인.
    """
    q = query.strip()
    if not q:
        return []

    q_clean = re.sub(r"[^\w\s]", " ", q)
    q_tokens: list[str] = []
    for word in q_clean.split():
        if len(word) <= 2:
            q_tokens.append(word)
            continue
        for i in range(len(word) - 1):
            q_tokens.append(word[i : i + 2])

    q_set = set(q_tokens)
    scored: list[tuple[KSLEntry, float]] = []
    for entry in load_dictionary():
        tokens = set(entry.tokens)
        if not tokens:
            continue
        overlap = len(q_set & tokens)
        if overlap == 0 and entry.ko not in q and q not in entry.ko:
            continue
        score = overlap / max(len(q_set), 1)
        if entry.ko in q or q in entry.ko:
            score += 0.5
        scored.append((entry, score))

    scored.sort(key=lambda t: t[1], reverse=True)
    return scored[:top_k]
