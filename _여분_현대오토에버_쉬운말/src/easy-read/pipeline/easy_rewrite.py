"""쉬운글 변환 — 로컬 LLM(Ollama) 우선, 규칙 기반 폴백.

루트 CLAUDE.md §7 준수: OpenAI/Claude/Gemini 등 클라우드 API 금지.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx

from .structurize import Document, Paragraph

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "koddi_easy_korean.md"
OLLAMA_HOST = "http://localhost:11434"
OLLAMA_MODEL = "qwen2.5:32b-instruct-q4_K_M"


@dataclass
class EasyParagraph:
    """쉬운글로 변환된 단락."""

    original: str
    easy: list[str]
    pictograms: list[str]


@dataclass
class EasyDoc:
    """쉬운글 변환 결과 전체."""

    backend: str
    summary: list[str]
    paragraphs: list[EasyParagraph]
    warnings: list[str]


def _load_system_prompt() -> str:
    if PROMPT_PATH.exists():
        return PROMPT_PATH.read_text(encoding="utf-8")
    return "당신은 공공문서를 발달장애인·저문해 독자가 이해할 수 있도록 다시 쓰는 교정자이다."


def _try_ollama(document: Document, model: str = OLLAMA_MODEL, host: str = OLLAMA_HOST) -> EasyDoc | None:
    system_prompt = _load_system_prompt()
    user_prompt = _build_user_prompt(document)

    try:
        response = httpx.post(
            f"{host}/api/chat",
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "stream": False,
                "format": "json",
                "options": {"temperature": 0.2},
            },
            timeout=300.0,
        )
        response.raise_for_status()
        data = response.json()
        content = data.get("message", {}).get("content", "")
        parsed: dict[str, Any] = json.loads(content)
        return _parse_llm_response(parsed, backend=f"ollama ({model})")
    except Exception as exc:
        logger.warning("Ollama 실패: %s", exc)
        return None


def _build_user_prompt(document: Document) -> str:
    lines = [
        "아래는 공공 문서의 OCR 결과 단락입니다.",
        "지침대로 쉬운 글로 다시 쓰고 JSON 하나만 출력하세요.",
        "",
        "【문서】",
    ]
    for idx, para in enumerate(document.paragraphs, start=1):
        lines.append(f"{idx}. {para.text}")
    lines.append("")
    lines.append("【추출된 팩트】")
    lines.append(f"- 기한: {', '.join(document.key_facts.deadlines) or '없음'}")
    lines.append(f"- 금액: {', '.join(document.key_facts.amounts) or '없음'}")
    lines.append(f"- 전화번호: {', '.join(document.key_facts.phones) or '없음'}")
    return "\n".join(lines)


def _parse_llm_response(data: dict[str, Any], backend: str) -> EasyDoc:
    summary_raw = data.get("summary", "")
    if isinstance(summary_raw, str):
        summary = [s.strip() for s in summary_raw.split("\n") if s.strip()]
    elif isinstance(summary_raw, list):
        summary = [str(s) for s in summary_raw]
    else:
        summary = []

    paragraphs: list[EasyParagraph] = []
    for row in data.get("paragraphs", []) or []:
        if not isinstance(row, dict):
            continue
        paragraphs.append(
            EasyParagraph(
                original=str(row.get("original", "")),
                easy=[str(s) for s in row.get("easy", []) if isinstance(s, str)],
                pictograms=[str(s) for s in row.get("pictograms", []) if isinstance(s, str)],
            )
        )
    warnings = [str(w) for w in data.get("warnings", []) if isinstance(w, str)]
    return EasyDoc(backend=backend, summary=summary, paragraphs=paragraphs, warnings=warnings)


# ------------------------------ 규칙 기반 폴백 ------------------------------

REPLACE_MAP = {
    "수납": "돈을 내요",
    "납부": "돈을 내요",
    "교부": "받아요",
    "발급": "받아요",
    "제출": "내요",
    "신청": "신청",
    "지급": "드려요",
    "경과": "지나면",
    "가산금": "추가로 내는 돈",
    "부과": "매겨요",
    "문의": "궁금하면 전화",
    "지사": "가까운 사무실",
    "첨부": "같이 내세요",
    "반납": "돌려줘요",
    "접수": "접수",
    "민원": "민원",
    "기재": "써 주세요",
    "작성": "써 주세요",
    "성명": "이름",
    "확인": "확인",
}


def _rule_based_easy(text: str) -> list[str]:
    """간단한 치환 기반 쉬운글 변환."""
    replaced = text
    for k, v in REPLACE_MAP.items():
        replaced = replaced.replace(k, v)

    # 25음절 단위로 쪼개되, 문장 기호에서 우선 분리.
    sentences = re.split(r"(?<=[\.\!\?。])\s+", replaced)
    out: list[str] = []
    for s in sentences:
        s = s.strip()
        if not s:
            continue
        while len(s) > 25:
            cut = s[:25]
            # 공백 기준 역방향 절단
            space_idx = cut.rfind(" ")
            if space_idx > 10:
                out.append(cut[:space_idx].strip())
                s = s[space_idx:].strip()
            else:
                out.append(cut.strip())
                s = s[25:].strip()
        if s:
            out.append(s)
    return out


def _extract_pictograms(text: str) -> list[str]:
    keys = [
        "돈", "세금", "날짜", "기한", "서류", "등본", "서명", "도장", "전화",
        "병원", "약", "예약", "은행", "카드", "학교", "시험", "버스", "지하철",
        "택시", "경찰", "소방", "119", "112", "주소", "집", "오늘", "내일",
    ]
    found: list[str] = []
    for k in keys:
        if k in text and k not in found:
            found.append(k)
    return found


def _rule_based(document: Document) -> EasyDoc:
    paragraphs: list[EasyParagraph] = []
    all_easy: list[str] = []
    for para in document.paragraphs:
        easy = _rule_based_easy(para.text)
        paragraphs.append(
            EasyParagraph(
                original=para.text,
                easy=easy,
                pictograms=_extract_pictograms(para.text),
            )
        )
        all_easy.extend(easy)

    summary = all_easy[:5]
    warnings = ["자동 변환 품질이 낮을 수 있음 — 로컬 LLM(Ollama) 연결 시 품질 향상."]
    return EasyDoc(backend="rule-based", summary=summary, paragraphs=paragraphs, warnings=warnings)


def rewrite(document: Document, prefer_ollama: bool = True) -> EasyDoc:
    """Document → EasyDoc. Ollama 사용 가능하면 우선."""
    if prefer_ollama:
        result = _try_ollama(document)
        if result is not None:
            return result
    logger.info("Ollama 미가용 — 규칙 기반 폴백")
    return _rule_based(document)
