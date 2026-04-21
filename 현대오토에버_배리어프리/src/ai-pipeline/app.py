"""WorkBuddy KR — Streamlit 데모 앱 (PoC).

베트남어/네팔어 음성 → 한국어 산재신청서·임금체불 진정서 자동 생성.

실행:
    streamlit run src/ai-pipeline/app.py
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from pathlib import Path

import streamlit as st

# 같은 디렉토리의 모듈 import 가능하게
sys.path.insert(0, str(Path(__file__).parent))

from form_mapper import generate_form, is_mock_mode as form_mock_mode  # noqa: E402
from pdf_renderer import render_pdf  # noqa: E402
from stt import (  # noqa: E402
    MOCK_TRANSCRIPTS,
    MOCK_TRANSCRIPT_TRANSLATION_KO,
    is_mock_mode as stt_mock_mode,
    transcribe,
)

# ─── 페이지 설정 ──────────────────────────────────────────
st.set_page_config(
    page_title="WorkBuddy KR — AI 권리행사 동반앱",
    page_icon="🤝",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─── 사이드바 ────────────────────────────────────────────
with st.sidebar:
    st.markdown("## 🤝 WorkBuddy KR")
    st.caption("외국인 근로자 권리행사 AI 동반앱 · PoC")
    st.divider()

    st.markdown("### ⚙️ 설정")

    lang_label = {
        "vi": "🇻🇳 베트남어 (Tiếng Việt)",
        "ne": "🇳🇵 네팔어 (नेपाली)",
        "ko": "🇰🇷 한국어 (테스트)",
    }
    lang = st.selectbox(
        "사용자 모국어",
        options=list(lang_label.keys()),
        format_func=lambda x: lang_label[x],
        index=0,
    )

    form_label = {
        "sanjae": "📋 산재요양급여 신청서",
        "wage_unpaid": "💰 임금체불 진정서",
    }
    form_type = st.selectbox(
        "생성할 양식",
        options=list(form_label.keys()),
        format_func=lambda x: form_label[x],
        index=0,
    )

    st.divider()
    st.markdown("### 🔌 API 상태")
    if stt_mock_mode():
        st.warning("STT: 모킹 모드\n(OPENAI_API_KEY 미설정)")
    else:
        st.success("STT: 실제 호출 (Whisper)")

    if form_mock_mode():
        st.warning("LLM: 모킹 모드\n(ANTHROPIC_API_KEY 미설정)")
    else:
        st.success("LLM: 실제 호출 (Claude)")

    st.divider()
    st.caption(
        "본 데모는 2026 현대오토에버 배리어프리 앱 개발 콘테스트 출품작 "
        "**WorkBuddy KR**의 핵심 기능 (Killer Feature) PoC입니다."
    )

# ─── 메인 헤더 ───────────────────────────────────────────
st.markdown("# 🤝 WorkBuddy KR")
st.markdown("### 한국어를 몰라도, 권리는 알 수 있도록.")
st.caption(
    f"AI 기반 산재·임금체불 권리행사 동반앱 — 모국어 음성을 한국어 공식 양식으로 자동 변환합니다. "
    f"오늘은 {datetime.now().strftime('%Y년 %m월 %d일')}입니다."
)

# 핵심 수치 강조
col1, col2, col3, col4 = st.columns(4)
col1.metric("국내 외국인 취업자", "101만 명", "사상 첫 100만 돌파")
col2.metric("외국인 산재 사망 (5년 누적)", "453명", "사망률 내국인의 7배")
col3.metric("임금체불 권리구제율", "18%", "10명 중 9명 체불 경험")
col4.metric("이 앱이 채울 갭", "100%", "외국인 권리행사 도구 0개")

st.divider()

# ─── 4단계 파이프라인 시각화 ─────────────────────────────
st.markdown("## 🛠️ AI 파이프라인 — 음성에서 PDF까지 4단계")

steps_col = st.columns(4)
with steps_col[0]:
    st.info("**1️⃣ 음성 입력**\n\n모국어로 6하원칙 진술")
with steps_col[1]:
    st.info("**2️⃣ STT + 번역**\n\nWhisper → 한국어")
with steps_col[2]:
    st.info("**3️⃣ 양식 매핑**\n\nClaude 4.6 LLM")
with steps_col[3]:
    st.info("**4️⃣ PDF 생성**\n\n공식 양식 자동 작성")

st.divider()

# ─── Step 1: 음성 입력 ───────────────────────────────────
st.markdown("## 1️⃣ 음성 입력")

input_mode = st.radio(
    "입력 방식",
    options=["📁 음성 파일 업로드", "🎙️ 텍스트로 직접 입력 (시연용)", "🧪 모킹 데모 데이터 사용"],
    index=2,
    horizontal=True,
)

audio_bytes: bytes | None = None
text_override: str | None = None

if input_mode == "📁 음성 파일 업로드":
    audio_file = st.file_uploader(
        "음성 파일 (m4a, wav, mp3)",
        type=["m4a", "wav", "mp3", "mp4", "ogg"],
        help="모국어로 사고/체불 상황을 6하원칙(언제·어디서·누가·무엇을·어떻게·왜)에 따라 진술하세요.",
    )
    if audio_file:
        audio_bytes = audio_file.read()
        st.audio(audio_bytes)
        st.success(f"파일 업로드 완료: {audio_file.name} ({len(audio_bytes):,} bytes)")

elif input_mode == "🎙️ 텍스트로 직접 입력 (시연용)":
    text_override = st.text_area(
        f"{lang_label[lang]} 진술",
        value=MOCK_TRANSCRIPTS.get(lang, ""),
        height=150,
        help="실제 앱에서는 음성으로 진술합니다. 여기서는 시연을 위해 텍스트로 직접 입력합니다.",
    )

else:  # 모킹 데모
    st.info(
        "🧪 **모킹 데모 모드**: 실제 음성 파일 없이도 사전 정의된 시나리오로 "
        "전체 파이프라인을 시연합니다."
    )
    st.markdown(f"**시연 시나리오 ({lang_label[lang]})**:")
    st.code(MOCK_TRANSCRIPTS.get(lang, ""), language="text")

st.divider()

# ─── 실행 트리거 ─────────────────────────────────────────
run = st.button("🚀 파이프라인 실행", type="primary", use_container_width=True)

if run:
    # ─── Step 2: STT + 번역 ──────────────────────────────
    st.markdown("## 2️⃣ STT + 번역 (Whisper)")
    with st.spinner("음성 → 텍스트 → 한국어 번역 중..."):
        if text_override is not None:
            # 직접 입력된 텍스트 사용 (음성 단계 우회)
            stt_result = {
                "original_text": text_override,
                "translation_ko": MOCK_TRANSCRIPT_TRANSLATION_KO.get(lang, text_override),
                "lang": lang,
                "mock": True,
            }
        else:
            stt_result = transcribe(audio_bytes, lang)

    col_orig, col_ko = st.columns(2)
    with col_orig:
        st.markdown(f"**원문 ({lang_label[lang]})**")
        st.success(stt_result["original_text"])
    with col_ko:
        st.markdown("**한국어 번역**")
        st.success(stt_result["translation_ko"])

    if stt_result["mock"]:
        st.caption("ℹ️ 모킹 모드에서 실행 — 실제 운영 시 OpenAI Whisper API 호출")

    # ─── Step 3: 양식 매핑 ───────────────────────────────
    st.markdown("## 3️⃣ 양식 매핑 (Claude Sonnet 4.6)")
    with st.spinner(f"{form_label[form_type]} 자동 작성 중..."):
        form_data = generate_form(stt_result["translation_ko"], form_type)

    st.markdown("**자동 생성된 양식 데이터 (JSON)**")
    # _ 로 시작하는 메타 필드는 따로
    visible_fields = {k: v for k, v in form_data.items() if not k.startswith("_")}
    review_notes = form_data.get("_review_notes", [])

    with st.expander("📋 양식 필드 상세 (펼쳐 보기)", expanded=True):
        st.json(visible_fields)

    if review_notes:
        st.warning("⚠️ **사용자 검수가 필요한 항목**:")
        for note in review_notes:
            st.markdown(f"- {note}")

    if form_data.get("_mock"):
        st.caption("ℹ️ 모킹 모드 — 실제 운영 시 Claude Sonnet 4.6이 진술을 분석하여 양식 작성")

    # ─── Step 4: PDF 생성 ────────────────────────────────
    st.markdown("## 4️⃣ PDF 생성")
    with st.spinner("ReportLab으로 한글 PDF 렌더링 중..."):
        # 직접 호출 (상대 import 회피)
        from pdf_renderer import render_pdf as _render

        pdf_bytes = _render(form_data, form_type, user_lang=lang)

    col_btn, col_meta = st.columns([2, 3])
    with col_btn:
        st.download_button(
            label="📥 PDF 다운로드",
            data=pdf_bytes,
            file_name=f"workbuddy_{form_type}_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf",
            mime="application/pdf",
            type="primary",
            use_container_width=True,
        )
    with col_meta:
        st.metric("생성된 PDF 크기", f"{len(pdf_bytes):,} bytes")

    st.success(
        f"✅ 전체 파이프라인 완료! "
        f"외국인 근로자가 모국어로 진술한 내용이 한국어 공식 양식 PDF로 자동 변환되었습니다."
    )

    # 임팩트 강조
    st.divider()
    st.markdown("### 💡 이 데모가 보여주는 것")
    impact_col = st.columns(3)
    with impact_col[0]:
        st.markdown(
            "**🌐 언어 장벽 해소**\n\n"
            "기존: 외국인이 한국어 양식을 직접 작성 → 권리행사 포기\n\n"
            "WorkBuddy: 모국어 진술 → 자동 한국어 양식"
        )
    with impact_col[1]:
        st.markdown(
            "**⚡ 시간 단축**\n\n"
            "기존: 평균 4.2개월 (인권위 분석)\n\n"
            "WorkBuddy: 15초 ~ 5분 → 신고까지 72시간 이내 목표"
        )
    with impact_col[2]:
        st.markdown(
            "**📈 권리구제율 상승**\n\n"
            "기존: 임금체불 신고 후 18% (인권위 2024)\n\n"
            "WorkBuddy 목표: 50%+"
        )

# ─── 푸터 ────────────────────────────────────────────────
st.divider()
st.caption(
    "WorkBuddy KR · v0.1.0-poc · 2026 현대오토에버 배리어프리 앱 개발 콘테스트 · "
    "📄 [제안서](../../docs/제안서.md) · 📋 [개발계획서](../../docs/개발계획서.md) · "
    "📊 [개발보고서](../../docs/개발보고서.md)"
)
