"""하이라이트 레이어 — 금액·날짜·서명란 강조 마크다운 생성."""

from __future__ import annotations

import re

from .structurize import AMOUNT_RE, DATE_RE, PHONE_RE


def highlight_markdown(text: str) -> str:
    """금액·날짜·전화번호를 굵게 + 이모지로 강조."""
    def amount_sub(m: re.Match[str]) -> str:
        return f"**💰 {m.group(0)}**"

    def date_sub(m: re.Match[str]) -> str:
        return f"**📅 {m.group(0)}**"

    def phone_sub(m: re.Match[str]) -> str:
        return f"**📞 {m.group(0)}**"

    out = AMOUNT_RE.sub(amount_sub, text)
    out = DATE_RE.sub(date_sub, out)
    out = PHONE_RE.sub(phone_sub, out)
    return out
