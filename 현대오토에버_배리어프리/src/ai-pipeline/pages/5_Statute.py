"""권리 만료 시효 자동 카운트다운 — 알면 권리, 모르면 소멸."""

from __future__ import annotations

from datetime import date, datetime, timedelta

import pandas as pd
import streamlit as st

st.set_page_config(page_title="권리 시효", page_icon="⏰", layout="wide")

# ─── 시효 법령 정의 ────────────────────────────────────
RIGHTS = [
    {
        "권리": "산재 보험급여 청구권",
        "시효일수": 3 * 365,
        "법적근거": "산업재해보상보험법 제112조",
        "기산점": "요양을 받은 날의 다음날",
        "유형": "산재",
    },
    {
        "권리": "임금채권 (체불임금)",
        "시효일수": 3 * 365,
        "법적근거": "근로기준법 제49조",
        "기산점": "정기지급일",
        "유형": "임금",
    },
    {
        "권리": "퇴직금 청구권",
        "시효일수": 3 * 365,
        "법적근거": "근로자퇴직급여보장법 제10조",
        "기산점": "퇴직일",
        "유형": "임금",
    },
    {
        "권리": "부당해고 구제신청",
        "시효일수": 3 * 30,
        "법적근거": "근로기준법 제28조",
        "기산점": "해고일",
        "유형": "해고",
    },
    {
        "권리": "사업장 변경 신청",
        "시효일수": 90,
        "법적근거": "외국인근로자고용법 제25조",
        "기산점": "변경 사유 발생일",
        "유형": "체류",
    },
]


def calc_status(occurred: date, days: int) -> dict:
    deadline = occurred + timedelta(days=days)
    today = date.today()
    remaining = (deadline - today).days
    if remaining < 0:
        status, color = "🚨 시효 소멸", "red"
    elif remaining <= 30:
        status, color = "⚠️ 임박", "orange"
    elif remaining <= 90:
        status, color = "🔔 주의", "yellow"
    else:
        status, color = "✅ 충분", "green"
    return {"deadline": deadline, "remaining": remaining, "status": status, "color": color}


# ─── 헤더 ──────────────────────────────────────────────
st.markdown("# ⏰ 권리 만료 시효 자동 카운트다운")
st.markdown("### 아는 만큼만 권리다. 모르는 시효는 가만히 사라진다.")
st.caption(
    "산재·임금체불·퇴직금·부당해고·사업장 변경 등 5가지 권리의 시효를 자동 계산하고 "
    "D-30, D-7, D-1 시점에 다중 알림을 발송합니다."
)

st.divider()

# ─── 사이드바 ─────────────────────────────────────────
with st.sidebar:
    st.markdown("## ⏰ 권리 시효 모드")
    st.divider()
    st.markdown("### 📲 알림 채널")
    notify_app = st.checkbox("앱 푸시", value=True)
    notify_sms = st.checkbox("SMS", value=True)
    notify_kakao = st.checkbox("카카오톡", value=True)
    st.divider()
    st.markdown("### ⚖️ 법적 근거")
    st.markdown(
        "- 산재보상법 제112조 (3년)\n"
        "- 근로기준법 제49조 (3년)\n"
        "- 퇴직급여법 제10조 (3년)\n"
        "- 근로기준법 제28조 (3개월)\n"
        "- 외국인고용법 제25조 (90일)"
    )

# ─── 사용자 정보 입력 ─────────────────────────────────
st.markdown("## 👤 사용자 정보")

col_u1, col_u2, col_u3 = st.columns(3)
with col_u1:
    user_name = st.text_input("이름", "응우옌 반 안")
with col_u2:
    visa_expiry = st.date_input("비자 만료일", date(2027, 6, 30))
with col_u3:
    nationality = st.selectbox("국적", ["베트남", "네팔", "캄보디아", "미얀마", "기타"])

st.divider()

# ─── 사건 입력 ────────────────────────────────────────
st.markdown("## 📅 발생 사건 입력")

st.caption("아래 표에서 본인의 사건이 발생한 날짜를 입력하세요. 해당 권리의 시효가 자동 계산됩니다.")

events = {}
for r in RIGHTS:
    label = f"{r['권리']} 기산일 (※ {r['기산점']})"
    events[r["권리"]] = st.date_input(
        label, value=date(2026, 1, 15), key=f"date_{r['권리']}"
    )

st.divider()

# ─── 시효 카운트다운 ─────────────────────────────────
st.markdown("## ⏳ 시효 카운트다운")

rows = []
for r in RIGHTS:
    occurred = events[r["권리"]]
    s = calc_status(occurred, r["시효일수"])
    rows.append(
        {
            "권리": r["권리"],
            "기산일": occurred.strftime("%Y-%m-%d"),
            "시효 만료일": s["deadline"].strftime("%Y-%m-%d"),
            "남은 일수": s["remaining"],
            "상태": s["status"],
            "법적 근거": r["법적근거"],
        }
    )

# DataFrame 표시
df = pd.DataFrame(rows)
st.dataframe(df, use_container_width=True, hide_index=True)

# ─── 비자 만료 vs 권리 시효 비교 ──────────────────────
st.divider()
st.markdown("## 🛂 비자 만료일 vs 권리 시효 — ‘체류 종료 전 반드시 처리할 권리’")

today = date.today()
visa_remaining = (visa_expiry - today).days

st.metric(
    f"비자(E-9) 만료까지",
    f"{visa_remaining}일",
    f"({visa_expiry.strftime('%Y-%m-%d')})",
)

urgent_rights = []
for r in RIGHTS:
    s = calc_status(events[r["권리"]], r["시효일수"])
    # 비자 만료가 시효보다 먼저 오는 경우 = 출국 전 처리 필요
    if 0 < visa_remaining < s["remaining"]:
        urgent_rights.append((r["권리"], s["deadline"], s["remaining"]))

if urgent_rights:
    st.error(
        f"🚨 **{user_name}님은 비자 만료({visa_remaining}일)가 다음 권리 시효보다 먼저 도래합니다.**\n"
        f"체류 중에 반드시 처리해야 할 권리가 {len(urgent_rights)}개 있습니다."
    )
    for right, deadline, remaining in urgent_rights:
        st.warning(
            f"- **{right}** : 시효 {deadline.strftime('%Y-%m-%d')} (D-{remaining}), "
            f"비자 {visa_expiry.strftime('%Y-%m-%d')} (D-{visa_remaining}) → "
            f"비자 내 처리 필수"
        )
else:
    st.success("✅ 비자 만료 전 모든 권리를 행사할 수 있는 충분한 시간이 있습니다.")

# ─── 알림 미리보기 ────────────────────────────────────
st.divider()
st.markdown("## 📨 자동 알림 미리보기")

st.caption("D-30, D-7, D-1 시점에 자동 발송될 알림 (예시):")

for r in RIGHTS[:2]:
    s = calc_status(events[r["권리"]], r["시효일수"])
    if 0 < s["remaining"] <= 90:
        with st.container(border=True):
            st.markdown(f"**🔔 {r['권리']} 시효 알림 — D-{s['remaining']}**")
            channels = []
            if notify_app:
                channels.append("📱 앱 푸시")
            if notify_sms:
                channels.append("💬 SMS")
            if notify_kakao:
                channels.append("💛 카카오톡")
            st.code(
                f"발송 채널: {', '.join(channels)}\n\n"
                f"[WorkBuddy KR · 권리 시효 알림]\n"
                f"{user_name}님, {r['권리']}의 시효 만료까지 {s['remaining']}일 남았습니다.\n"
                f"법적 근거: {r['법적근거']}\n"
                f"⚠️ 시효가 지나면 권리 자체가 소멸됩니다.\n"
                f"→ WorkBuddy 앱에서 지금 바로 신청서 작성을 시작하세요.",
                language="text",
            )

# ─── 통계 ────────────────────────────────────────────
st.divider()
st.markdown("## 📊 권리 시효 인지율 — 본 서비스의 임팩트")

col_b1, col_b2, col_b3 = st.columns(3)
col_b1.metric("기존 외국인 시효 인지율", "낮음", "인권위 분석")
col_b2.metric("WorkBuddy 자동 알림 도입 후 누락률", "0%", "목표")
col_b3.metric("비자 연동 ‘체류 중 필수’ 자동 추출", "✅ 작동", "본 페이지에서 시연")

# ─── 푸터 ────────────────────────────────────────────
st.divider()
st.caption(
    "⏰ 권리 시효 카운트다운 · WorkBuddy KR PoC · "
    "법령 데이터: 국가법령정보센터 (https://law.go.kr) · "
    "시효 계산은 일반 원칙 기준이며, 개별 사건의 정확한 시효는 노무사·변호사 상담 권장."
)
