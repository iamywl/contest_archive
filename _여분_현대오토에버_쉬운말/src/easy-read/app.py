"""쉬운말 (Easy-Read) Streamlit PoC 엔트리.

파이프라인: 이미지/PDF 업로드 → OCR → 구조화 → 로컬 LLM 쉬운글 변환 → 픽토그램 + 하이라이트 → TTS.
모든 단계는 로컬. Ollama 미가용 시 규칙 기반 폴백으로 UI 전체 흐름이 끊기지 않는다.
"""

from __future__ import annotations

import logging
import tempfile
from io import BytesIO
from pathlib import Path

import streamlit as st
from PIL import Image

from pipeline.easy_rewrite import EasyDoc, rewrite
from pipeline.highlight import highlight_markdown
from pipeline.ocr import OCRResult, run_ocr
from pipeline.pictogram import match_keywords
from pipeline.structurize import Document, structurize
from pipeline.tts import synthesize

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

APP_TITLE = "쉬운말 (Easy-Read) · PoC"
APP_ICON = "📘"

SAMPLE_DOCS: dict[str, str] = {
    "건강보험 고지서 (mock)": (
        "국민건강보험공단 안내문\n"
        "귀하의 2026년 4월 보험료는 84,720원입니다.\n"
        "납부 기한은 2026-05-10 까지입니다.\n"
        "기한 경과 시 연체 가산금이 부과될 수 있습니다.\n"
        "문의: 1577-1000 (평일 09:00~18:00)\n"
    ),
    "과태료 납부 고지서 (mock)": (
        "과태료 납부 고지서\n"
        "귀하께서는 2026-03-17 신호 위반으로 과태료 60,000원이 부과되었습니다.\n"
        "납부 기한은 2026-04-30 까지이며 기한 내 자진 납부 시 20% 감경됩니다.\n"
        "계좌: 농협 123-4567-8901\n"
        "문의: 02-1234-5678\n"
    ),
    "주민센터 민원서류 안내 (mock)": (
        "주민등록등본 교부 신청 안내\n"
        "신청서 작성 후 번호표를 뽑고 창구에서 수납해 주시기 바랍니다.\n"
        "수수료는 400원이며 카드·현금 모두 가능합니다.\n"
        "대리인 신청 시 위임장과 신분증을 함께 제출합니다.\n"
    ),
}


def main() -> None:
    st.set_page_config(page_title=APP_TITLE, page_icon=APP_ICON, layout="wide")
    st.title(f"{APP_ICON} {APP_TITLE}")
    st.caption(
        "공문서 이미지/PDF 를 쉬운 한국어 + 픽토그램 + 음성으로 변환하는 로컬 PoC.\n"
        "모든 추론은 **온디바이스** — 업로드 원본은 기기 밖으로 나가지 않는다."
    )
    _sidebar()

    source = st.session_state.get("source", "sample")
    ocr_result: OCRResult | None = None

    if source == "sample":
        ocr_result = _handle_sample()
    elif source == "image":
        ocr_result = _handle_image_upload()
    elif source == "text":
        ocr_result = _handle_text_input()

    if ocr_result is None:
        return

    st.divider()
    doc = structurize(ocr_result)
    _render_ocr_section(ocr_result, doc)

    st.divider()
    with st.spinner("로컬 LLM(또는 규칙)으로 쉬운글 변환 중..."):
        easy = rewrite(doc, prefer_ollama=st.session_state.get("use_ollama", True))
    _render_easy_section(easy)


def _sidebar() -> None:
    with st.sidebar:
        st.header("입력 소스")
        st.session_state.setdefault("source", "sample")
        st.session_state["source"] = st.radio(
            "문서 소스",
            options=["sample", "image", "text"],
            format_func=lambda v: {"sample": "🧪 샘플 문서", "image": "🖼️ 이미지 업로드", "text": "✍️ 직접 입력"}[v],
            index=["sample", "image", "text"].index(st.session_state["source"]),
        )

        st.divider()
        st.header("로컬 AI")
        st.session_state.setdefault("use_ollama", True)
        st.session_state["use_ollama"] = st.checkbox(
            "Ollama 로컬 LLM 사용",
            value=st.session_state["use_ollama"],
            help="미설치 시 자동으로 규칙 기반 폴백 사용",
        )
        st.caption(
            "- Ollama `qwen2.5:32b-instruct-q4_K_M` 을 우선 호출\n"
            "- OCR: PaddleOCR → Tesseract → mock\n"
            "- TTS: Kokoro → pyttsx3 → 안내 메시지"
        )


def _handle_sample() -> OCRResult | None:
    selected = st.selectbox("샘플 문서를 선택하세요", list(SAMPLE_DOCS.keys()))
    text = SAMPLE_DOCS[selected]
    st.markdown("### 원문")
    st.code(text, language="text")
    # OCR 우회 — 샘플 문자열을 그대로 OCRResult 로 변환.
    from pipeline.ocr import OCRLine
    lines = [
        OCRLine(text=t, confidence=1.0, bbox=(10, 20 + 40 * i, 600, 60 + 40 * i))
        for i, t in enumerate(text.splitlines())
        if t.strip()
    ]
    return OCRResult(backend="sample-string", lines=lines)


def _handle_image_upload() -> OCRResult | None:
    uploaded = st.file_uploader("공문서 이미지를 업로드하세요", type=["jpg", "jpeg", "png"])
    if uploaded is None:
        st.info("이미지 업로드 후 OCR 결과가 표시됩니다. (PaddleOCR/Tesseract 없으면 mock 문서 사용)")
        return None
    image = Image.open(uploaded).convert("RGB")
    col_a, col_b = st.columns(2)
    with col_a:
        st.image(image, caption="원본 이미지", use_container_width=True)
    with col_b:
        with st.spinner("로컬 OCR 실행 중..."):
            ocr = run_ocr(image)
        st.success(f"OCR 백엔드: {ocr.backend} · 라인 {len(ocr.lines)}개")
        st.code(ocr.full_text, language="text")
    return ocr


def _handle_text_input() -> OCRResult | None:
    text = st.text_area(
        "원문 텍스트를 붙여넣으세요",
        height=200,
        placeholder="예: 귀하의 2026년 4월 보험료는 84,720원입니다. ...",
    )
    if not text.strip():
        return None
    from pipeline.ocr import OCRLine
    lines = [
        OCRLine(text=t, confidence=1.0, bbox=(10, 20 + 40 * i, 600, 60 + 40 * i))
        for i, t in enumerate(text.splitlines())
        if t.strip()
    ]
    return OCRResult(backend="direct-input", lines=lines)


def _render_ocr_section(ocr: OCRResult, doc: Document) -> None:
    st.markdown("### 🧾 원문 구조화")
    cols = st.columns([2, 1])
    with cols[0]:
        for idx, para in enumerate(doc.paragraphs, start=1):
            label = " (서명란)" if para.is_signature else ""
            st.markdown(f"**단락 {idx}{label}**")
            st.markdown(highlight_markdown(para.text))
    with cols[1]:
        st.markdown("**추출된 팩트**")
        facts = doc.key_facts
        if facts.is_empty:
            st.caption("자동 추출된 팩트가 없습니다.")
        else:
            if facts.deadlines:
                st.markdown(f"- 📅 기한: {', '.join(facts.deadlines)}")
            if facts.amounts:
                st.markdown(f"- 💰 금액: {', '.join(facts.amounts)}")
            if facts.phones:
                st.markdown(f"- 📞 전화: {', '.join(facts.phones)}")


def _render_easy_section(easy: EasyDoc) -> None:
    st.markdown("### ✨ 쉬운글 변환 결과")
    st.caption(f"LLM 백엔드: `{easy.backend}`")

    if easy.summary:
        st.markdown("#### 📌 한 눈에 요약")
        for s in easy.summary:
            st.markdown(f"- {s}")

    if easy.warnings:
        for w in easy.warnings:
            st.warning(w)

    for idx, para in enumerate(easy.paragraphs, start=1):
        with st.expander(f"단락 {idx}"):
            st.markdown("**원문**")
            st.markdown(highlight_markdown(para.original))
            st.markdown("**쉬운말**")
            for s in para.easy:
                st.markdown(f"- {s}")

            picts = match_keywords(para.pictograms)
            if picts:
                st.markdown("**픽토그램**")
                cols = st.columns(min(len(picts), 6))
                for col, pic in zip(cols, picts):
                    with col:
                        st.markdown(f"<div style='font-size:42px;text-align:center'>{pic.emoji}</div>", unsafe_allow_html=True)
                        st.caption(pic.keyword)
                        if not pic.has_asset:
                            st.caption("(로컬 SVG 미탑재 — emoji 대체)")

            if st.button("🔊 단락 TTS 재생", key=f"tts_{idx}"):
                _play_tts(" ".join(para.easy))


def _play_tts(text: str) -> None:
    if not text.strip():
        st.caption("재생할 텍스트가 없습니다.")
        return
    result = synthesize(text)
    if result.wav_path and result.wav_path.exists():
        st.audio(BytesIO(result.wav_path.read_bytes()), format="audio/wav")
        st.caption(f"TTS 백엔드: {result.backend}")
    else:
        st.caption(result.note or "TTS 백엔드 없음")


if __name__ == "__main__":
    main()
