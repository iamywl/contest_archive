"""실시간 AI 통역 — 외국인 노동자 ↔ 한국 노무사·공무원 양방향 채팅."""

from __future__ import annotations

import time
from datetime import datetime

import streamlit as st

st.set_page_config(page_title="실시간 통역", page_icon="🌐", layout="wide")

# ─── 모킹 양방향 통역 사전 ─────────────────────────────
TRANSLATIONS = {
    "vi_to_ko": {
        "Xin chào, tôi cần giúp đỡ về tai nạn lao động.": "안녕하세요, 산재 사고 관련해서 도움이 필요합니다.",
        "Tôi bị thương tay tại nhà máy.": "공장에서 손을 다쳤습니다.",
        "Ông chủ không cho tôi khai báo.": "사장이 신고를 못 하게 합니다.",
        "Tôi cần làm gì tiếp theo?": "다음에 무엇을 해야 하나요?",
        "Cảm ơn rất nhiều.": "정말 감사합니다.",
    },
    "ko_to_vi": {
        "안녕하세요, 어떤 사고였는지 알려주실 수 있나요?": "Xin chào, anh có thể cho tôi biết tai nạn xảy ra như thế nào không?",
        "사고 발생 시점과 장소를 정확히 말씀해 주세요.": "Vui lòng cho tôi biết chính xác thời gian và địa điểm xảy ra tai nạn.",
        "병원에서 진단서를 받으셨나요?": "Anh đã nhận được giấy chẩn đoán từ bệnh viện chưa?",
        "산재 신청을 도와드리겠습니다. 먼저 증거 사진이 있으신가요?": "Tôi sẽ giúp anh nộp đơn tai nạn lao động. Trước tiên, anh có ảnh làm bằng chứng không?",
    },
    "ne_to_ko": {
        "नमस्ते, मलाई तलब चाहिएको छ।": "안녕하세요, 제 임금이 필요합니다.",
        "तीन महिनाको तलब पाएको छैन।": "3개월치 임금을 받지 못했습니다.",
    },
    "ko_to_ne": {
        "체불 금액이 얼마인가요?": "तपाईंको कति तलब बाँकी छ?",
    },
}


def translate(text: str, direction: str) -> str:
    """모킹 통역. 사전에 없으면 유사 응답."""
    table = TRANSLATIONS.get(direction, {})
    if text in table:
        return table[text]
    # 미사전 응답 (모킹)
    if direction.endswith("_to_ko"):
        return f"[모국어 → 한국어 자동 통역됨] {text[:30]}..."
    return f"[Tiếng mẹ đẻ tự động dịch] {text[:30]}..."


# ─── 헤더 ──────────────────────────────────────────────
st.markdown("# 🌐 실시간 AI 통역")
st.markdown("### 외국인 노동자 ↔ 한국 노무사·공무원 양방향 즉시 통역")
st.caption(
    "GPT-4o Realtime 기반 음성-음성 직결 통역으로 평균 지연 ~300ms. "
    "1350 콜센터·노무사·근로감독관과의 통화에서 모국어 ↔ 한국어 자동 중계됩니다."
)

st.divider()

# ─── 사이드바 ─────────────────────────────────────────
with st.sidebar:
    st.markdown("## 🌐 통역 세션")
    st.divider()

    user_lang = st.selectbox(
        "내 모국어",
        ["🇻🇳 베트남어 (vi)", "🇳🇵 네팔어 (ne)", "🇰🇭 캄보디아어 (km)"],
    )
    counterpart = st.selectbox(
        "상대방",
        [
            "👨‍⚖️ 김 노무사 (안산)",
            "📞 1350 고용노동부 콜센터",
            "🏥 안산○○병원 응급실",
            "👮 평택지청 근로감독관",
        ],
    )
    mode = st.radio("통역 모드", ["💬 텍스트 채팅", "🎙️ 음성 통역 (정식 단계)"], index=0)

    st.divider()
    st.markdown("### 📊 세션 정보")
    if "msg_count" not in st.session_state:
        st.session_state.msg_count = 0
    st.metric("주고받은 메시지", st.session_state.msg_count)
    st.metric("평균 통역 지연 (모킹)", "0.3초", "GPT-4o Realtime 기준")

    st.divider()
    if st.button("🔄 세션 초기화"):
        st.session_state.messages = []
        st.session_state.msg_count = 0
        st.rerun()

# ─── 모드별 안내 ──────────────────────────────────────
if "음성" in mode:
    st.warning(
        "🎙️ 음성 통역은 정식 단계 기능입니다. PoC에서는 텍스트 채팅으로 시연합니다. "
        "정식: GPT-4o Realtime API로 음성 입력 → 즉시 모국어/한국어 음성 출력 (지연 ~300ms)."
    )

# ─── 채팅 인터페이스 ─────────────────────────────────
st.markdown(f"## 💬 채팅 — {counterpart}")

if "messages" not in st.session_state:
    st.session_state.messages = [
        {
            "role": "counterpart",
            "ko": "안녕하세요, 어떤 사고였는지 알려주실 수 있나요?",
            "vi": "Xin chào, anh có thể cho tôi biết tai nạn xảy ra như thế nào không?",
            "time": datetime.now().strftime("%H:%M"),
        }
    ]

# 메시지 표시
for msg in st.session_state.messages:
    if msg["role"] == "user":
        with st.chat_message("user", avatar="🧑"):
            col_lang, col_t = st.columns([5, 1])
            col_lang.markdown(f"**(모국어)** {msg['vi']}")
            col_t.caption(msg["time"])
            st.success(f"🌐 → 한국어로 통역됨\n\n**{msg['ko']}**")
    else:
        with st.chat_message("assistant", avatar="👨‍⚖️"):
            col_lang, col_t = st.columns([5, 1])
            col_lang.markdown(f"**(한국어)** {msg['ko']}")
            col_t.caption(msg["time"])
            st.info(f"🌐 → 모국어로 통역됨\n\n**{msg['vi']}**")

# ─── 입력 ────────────────────────────────────────────
prompt = st.chat_input("모국어로 메시지를 입력하세요... (예: Tôi cần giúp đỡ.)")
if prompt:
    direction_to_ko = "vi_to_ko" if "vi" in user_lang else "ne_to_ko"
    direction_from_ko = "ko_to_vi" if "vi" in user_lang else "ko_to_ne"

    # 사용자 메시지 추가 (모국어 → 한국어)
    ko_translation = translate(prompt, direction_to_ko)
    st.session_state.messages.append(
        {
            "role": "user",
            "vi": prompt,
            "ko": ko_translation,
            "time": datetime.now().strftime("%H:%M"),
        }
    )

    # 상대방 자동 응답 시뮬레이션 (간단 응답 매칭)
    if "tai nạn" in prompt.lower() or "사고" in ko_translation:
        reply_ko = "사고 발생 시점과 장소를 정확히 말씀해 주세요."
    elif "tay" in prompt.lower() or "손" in ko_translation:
        reply_ko = "병원에서 진단서를 받으셨나요?"
    elif "không cho" in prompt.lower() or "못 하게" in ko_translation:
        reply_ko = "산재 신청을 도와드리겠습니다. 먼저 증거 사진이 있으신가요?"
    else:
        reply_ko = "더 자세히 설명해 주실 수 있나요?"

    reply_vi = translate(reply_ko, direction_from_ko)
    st.session_state.messages.append(
        {
            "role": "counterpart",
            "ko": reply_ko,
            "vi": reply_vi,
            "time": datetime.now().strftime("%H:%M"),
        }
    )

    st.session_state.msg_count = len(st.session_state.messages)
    st.rerun()

# ─── 빠른 시연 버튼 ──────────────────────────────────
st.divider()
st.markdown("### 🚀 빠른 시연 — 미리 정의된 메시지로 통역 흐름 보기")

quick = st.columns(3)
demo_msgs = [
    "Xin chào, tôi cần giúp đỡ về tai nạn lao động.",
    "Tôi bị thương tay tại nhà máy.",
    "Ông chủ không cho tôi khai báo.",
]
for i, dm in enumerate(demo_msgs):
    if quick[i].button(f"💬 {dm[:25]}...", key=f"demo_{i}", use_container_width=True):
        ko = translate(dm, "vi_to_ko")
        st.session_state.messages.append(
            {
                "role": "user",
                "vi": dm,
                "ko": ko,
                "time": datetime.now().strftime("%H:%M"),
            }
        )
        # 응답
        if "tai nạn" in dm:
            r_ko = "사고 발생 시점과 장소를 정확히 말씀해 주세요."
        elif "tay" in dm:
            r_ko = "병원에서 진단서를 받으셨나요?"
        else:
            r_ko = "산재 신청을 도와드리겠습니다. 먼저 증거 사진이 있으신가요?"
        st.session_state.messages.append(
            {
                "role": "counterpart",
                "ko": r_ko,
                "vi": translate(r_ko, "ko_to_vi"),
                "time": datetime.now().strftime("%H:%M"),
            }
        )
        st.session_state.msg_count = len(st.session_state.messages)
        st.rerun()

# ─── 푸터 ──────────────────────────────────────────────
st.divider()
st.caption(
    "🌐 실시간 AI 통역 · WorkBuddy KR PoC · "
    "정식 단계: OpenAI GPT-4o Realtime API · 평균 지연 232~320ms · "
    "Twilio 음성 컨퍼런스 + AI 통역 중계 → 1350·노무사·공무원과 직접 통화"
)
