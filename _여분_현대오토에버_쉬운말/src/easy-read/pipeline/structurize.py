"""OCR 결과를 단락·서명란·금액 등 구조체로 분해."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from .ocr import OCRLine, OCRResult


AMOUNT_RE = re.compile(r"(\d{1,3}(?:,\d{3})+|\d+)\s*원")
DATE_RE = re.compile(r"(20\d{2})[.\-/\s]?(\d{1,2})[.\-/\s]?(\d{1,2})")
PHONE_RE = re.compile(r"\d{2,4}[- ]?\d{3,4}[- ]?\d{4}")


@dataclass
class KeyFacts:
    """문서에서 추출한 주요 팩트."""

    deadlines: list[str] = field(default_factory=list)
    amounts: list[str] = field(default_factory=list)
    phones: list[str] = field(default_factory=list)

    @property
    def is_empty(self) -> bool:
        return not (self.deadlines or self.amounts or self.phones)


@dataclass
class Paragraph:
    """단락 단위 묶음."""

    text: str
    lines: list[OCRLine]
    is_signature: bool = False


@dataclass
class Document:
    """구조화된 문서 전체."""

    paragraphs: list[Paragraph]
    key_facts: KeyFacts


def extract_key_facts(text: str) -> KeyFacts:
    """정규식 기반 1차 팩트 추출."""
    dates = [f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}" for m in DATE_RE.finditer(text)]
    amounts = AMOUNT_RE.findall(text)
    phones = PHONE_RE.findall(text)
    return KeyFacts(
        deadlines=dates,
        amounts=[f"{a}원" for a in amounts],
        phones=phones,
    )


def _is_signature_line(text: str) -> bool:
    t = text.strip()
    keywords = ("서명", "성명", "인감", "(인)", "(서명)")
    return any(k in t for k in keywords)


def _group_lines(lines: list[OCRLine], gap_px: int = 24) -> list[list[OCRLine]]:
    """OCR 줄을 y-gap 기반으로 단락 묶음으로 나눔."""
    if not lines:
        return []
    sorted_lines = sorted(lines, key=lambda l: (l.bbox[1], l.bbox[0]))
    groups: list[list[OCRLine]] = [[sorted_lines[0]]]
    for cur in sorted_lines[1:]:
        last = groups[-1][-1]
        if cur.bbox[1] - last.bbox[1] > gap_px:
            groups.append([cur])
        else:
            groups[-1].append(cur)
    return groups


def structurize(ocr: OCRResult) -> Document:
    """OCR 결과를 Document 로 변환."""
    paragraphs: list[Paragraph] = []
    for group in _group_lines(ocr.lines):
        text = " ".join(line.text for line in group).strip()
        if not text:
            continue
        paragraphs.append(
            Paragraph(
                text=text,
                lines=group,
                is_signature=_is_signature_line(text),
            )
        )
    facts = extract_key_facts(ocr.full_text)
    return Document(paragraphs=paragraphs, key_facts=facts)
