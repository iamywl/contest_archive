"""SOS 증거 수집 — 사고 즉시 사진·GPS·해시 자동 보존."""

from __future__ import annotations

import hashlib
import json
import random
from datetime import datetime, timedelta
from pathlib import Path

import streamlit as st

st.set_page_config(page_title="SOS 증거 수집", page_icon="🚨", layout="wide")

# ─── 헤더 ──────────────────────────────────────────────
st.markdown("# 🚨 SOS 증거 수집")
st.markdown("### 사고 발생 시 가장 먼저 사라지는 것은 ‘증거’다.")
st.caption(
    "회사가 CCTV를 지우기 전에 사진·영상·위치·시간을 자동으로 위변조 불가능한 형태로 보존합니다. "
    "법정 증거 효력을 위해 SHA-256 해시를 즉시 생성합니다."
)

st.divider()

# ─── 사이드바 ─────────────────────────────────────────
with st.sidebar:
    st.markdown("## 🚨 SOS 모드")
    st.caption("긴급 증거 수집 PoC")
    st.divider()
    sos_lang = st.selectbox(
        "비상 알림 언어",
        ["🇻🇳 베트남어", "🇳🇵 네팔어", "🇰🇭 캄보디아어", "🇰🇷 한국어"],
    )
    notify_targets = st.multiselect(
        "비상 연락 대상 (자동 SMS)",
        [
            "가족 (모국 연락처)",
            "안산이주민센터",
            "베트남 영사관",
            "공익법센터 어필",
            "1350 고용노동부",
        ],
        default=["가족 (모국 연락처)", "안산이주민센터"],
    )
    st.divider()
    st.markdown("### 🔐 증거 무결성 보장")
    st.markdown(
        "- SHA-256 해시 생성\n"
        "- AWS S3 Object Lock (Compliance Mode)\n"
        "- RFC 3161 타임스탬프\n"
        "- GPS 좌표 영구 보존\n"
        "- 네트워크 단절 시 로컬 저장"
    )

# ─── 1. 원터치 SOS 시뮬레이션 ─────────────────────────
st.markdown("## 1️⃣ 원터치 SOS 트리거")

col_btn, col_state = st.columns([1, 2])
with col_btn:
    sos_pressed = st.button(
        "🚨 SOS 버튼 (1탭)",
        type="primary",
        use_container_width=True,
        help="실제 모바일 앱에서는 홈 화면 큰 빨간 버튼. 1초 길게 누름.",
    )
with col_state:
    if sos_pressed:
        st.error(
            "🔴 **SOS 활성화 — 자동 증거 수집 진행 중**\n\n"
            "카메라 · 녹음 · GPS · 비상 SMS 동시 작동"
        )
    else:
        st.info("ℹ️ SOS 버튼을 누르면 자동으로 증거 수집이 시작됩니다.")

st.divider()

# ─── 2. 증거 업로드 ──────────────────────────────────
st.markdown("## 2️⃣ 증거 미디어 업로드 (사진·영상)")

col_up, col_meta = st.columns([3, 2])
with col_up:
    uploaded = st.file_uploader(
        "사고 현장 사진/영상 (다중 업로드 가능)",
        type=["png", "jpg", "jpeg", "mp4", "mov", "wav", "m4a"],
        accept_multiple_files=True,
        help="실제 앱에서는 SOS 트리거 시 자동 촬영·녹음됨.",
    )

with col_meta:
    st.markdown("**📍 사고 현장 정보 (메타데이터)**")
    location_name = st.text_input("사고 장소", "경기 안산시 단원구 ○○로 123 (도금공장)")
    industry = st.selectbox(
        "사업장 업종",
        ["제조업 (도금)", "건설업", "농업", "어업", "운수·물류", "기타"],
    )

st.divider()

# ─── 3. 자동 무결성 처리 (SHA-256 해시) ────────────────
st.markdown("## 3️⃣ 자동 무결성 처리 — SHA-256 해시 + GPS + 타임스탬프")

if uploaded:
    # 위변조 불가 메타데이터 자동 생성
    rows = []
    for f in uploaded:
        content = f.read()
        sha = hashlib.sha256(content).hexdigest()
        # 모킹 GPS (안산 일대)
        lat = 37.3219 + random.uniform(-0.005, 0.005)
        lng = 126.8309 + random.uniform(-0.005, 0.005)
        rows.append(
            {
                "파일명": f.name,
                "유형": f.type or "unknown",
                "크기 (bytes)": f"{len(content):,}",
                "SHA-256": sha[:16] + "..." + sha[-8:],
                "GPS (위도, 경도)": f"{lat:.6f}, {lng:.6f}",
                "타임스탬프": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "S3 Object Lock": "✅ Compliance Mode",
            }
        )

    st.success(f"✅ **{len(uploaded)}개 미디어 위변조 방지 메타데이터 생성 완료**")
    st.dataframe(rows, use_container_width=True, hide_index=True)

    # 사진 미리보기
    image_files = [f for f in uploaded if (f.type or "").startswith("image")]
    if image_files:
        st.markdown("**📷 업로드된 사진 미리보기**")
        cols = st.columns(min(len(image_files), 4))
        for i, img in enumerate(image_files[:4]):
            img.seek(0)
            cols[i].image(img, caption=img.name, use_container_width=True)
else:
    st.info("ℹ️ 위 단계에서 파일을 업로드하면 자동으로 무결성 메타데이터가 생성됩니다.")

st.divider()

# ─── 4. 비상 알림 발송 시뮬레이션 ─────────────────────
st.markdown("## 4️⃣ 비상 연락망 자동 SMS 발송")

if uploaded and notify_targets:
    st.markdown(f"**📨 다음 {len(notify_targets)}개 대상에게 SMS 발송됨:**")
    for target in notify_targets:
        with st.container(border=True):
            col_tgt, col_msg = st.columns([1, 3])
            col_tgt.markdown(f"**{target}**")
            col_msg.code(
                f"[WorkBuddy KR · 긴급 알림 / 발송 시각 {datetime.now().strftime('%Y-%m-%d %H:%M')}]\n"
                f"외국인 근로자 응우옌 반 안 (E-9, 베트남)이 SOS를 활성화했습니다.\n"
                f"위치: {location_name}\n"
                f"증거 {len(uploaded)}건 자동 보존 (S3 Object Lock).\n"
                f"※ 이 메시지는 사용자 동의 하에 자동 발송됩니다.",
                language="text",
            )

    st.success("✅ 비상 연락망 발송 완료 — 사장의 산재 은폐 시도를 사전 차단합니다.")
else:
    st.info("ℹ️ 증거 업로드 + 비상 연락 대상을 선택하면 자동 SMS가 발송됩니다.")

st.divider()

# ─── 5. 다음 단계 안내 ───────────────────────────────
st.markdown("## 5️⃣ 다음 단계")

col_next = st.columns(3)
with col_next[0]:
    st.info(
        "**📝 AI 서류 작성**\n\n"
        "수집된 증거를 첨부하여 산재요양급여 신청서를 모국어로 진술 → 자동 생성"
    )
with col_next[1]:
    st.info(
        "**🗺️ 전문가 매칭**\n\n"
        "근처 베트남어 가능 노무사·산재병원과 자동 매칭"
    )
with col_next[2]:
    st.info(
        "**⏰ 시효 카운트다운**\n\n"
        "사고일 기준 산재 보험급여 청구 시효 (3년) 자동 등록"
    )

# ─── 푸터 ────────────────────────────────────────────
st.divider()
st.caption(
    "🚨 SOS 증거 수집 · WorkBuddy KR PoC · "
    "법적 근거: 「민사소송법」 제202조의2 (전자기록의 증거능력) · "
    "기술 근거: AWS S3 Object Lock Compliance Mode"
)
