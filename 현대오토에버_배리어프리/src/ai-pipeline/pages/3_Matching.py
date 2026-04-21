"""다국어 전문가·기관 매칭 — 위치 기반 노무사·산재병원·이주민센터 검색."""

from __future__ import annotations

import math
import random

import pandas as pd
import streamlit as st

st.set_page_config(page_title="전문가 매칭", page_icon="🗺️", layout="wide")

# ─── 모킹 전문가 DB ────────────────────────────────────
EXPERTS = [
    # 노무사
    {"이름": "김 노무사", "유형": "노무사", "기관": "○○공인노무사사무소", "주소": "경기 안산시 단원구", "lat": 37.3219, "lng": 126.8309, "언어": ["베트남어", "영어"], "전문": ["산재", "임금체불"], "상담료": 0, "평점": 4.8, "검증": True},
    {"이름": "박 노무사", "유형": "노무사", "기관": "○○노동법률사무소", "주소": "경기 시흥시", "lat": 37.3801, "lng": 126.8030, "언어": ["네팔어", "영어"], "전문": ["산재", "퇴직금"], "상담료": 50000, "평점": 4.5, "검증": True},
    {"이름": "이 노무사", "유형": "노무사", "기관": "공익법센터 어필", "주소": "서울 종로구", "lat": 37.5729, "lng": 126.9794, "언어": ["베트남어", "캄보디아어", "영어"], "전문": ["권리행사 전반", "공익소송"], "상담료": 0, "평점": 4.9, "검증": True},
    {"이름": "최 노무사", "유형": "노무사", "기관": "노동인권센터", "주소": "충남 천안시", "lat": 36.8151, "lng": 127.1139, "언어": ["네팔어", "영어"], "전문": ["임금체불", "농업"], "상담료": 0, "평점": 4.7, "검증": True},
    # 변호사
    {"이름": "정 변호사", "유형": "변호사", "기관": "○○법률사무소", "주소": "경기 수원시", "lat": 37.2636, "lng": 127.0286, "언어": ["미얀마어", "영어"], "전문": ["산재", "체류 자격"], "상담료": 100000, "평점": 4.6, "검증": True},
    # 산재병원
    {"이름": "안산○○병원", "유형": "산재병원", "기관": "근로복지공단 지정", "주소": "경기 안산시 상록구", "lat": 37.3015, "lng": 126.8475, "언어": ["베트남어", "중국어"], "전문": ["응급의료", "외과"], "상담료": 0, "평점": 4.4, "검증": True},
    {"이름": "고려대안산병원", "유형": "산재병원", "기관": "근로복지공단 지정", "주소": "경기 안산시 단원구", "lat": 37.3115, "lng": 126.8401, "언어": ["베트남어", "영어"], "전문": ["응급의료", "정형외과"], "상담료": 0, "평점": 4.7, "검증": True},
    {"이름": "단국대천안병원", "유형": "산재병원", "기관": "근로복지공단 지정", "주소": "충남 천안시", "lat": 36.8202, "lng": 127.1614, "언어": ["네팔어", "영어"], "전문": ["응급의료", "외과"], "상담료": 0, "평점": 4.5, "검증": True},
    # 이주민센터 (잔존)
    {"이름": "안산이주민센터", "유형": "이주민센터", "기관": "지자체 운영", "주소": "경기 안산시 단원구 원곡동", "lat": 37.3262, "lng": 126.8141, "언어": ["베트남어", "네팔어", "캄보디아어", "미얀마어"], "전문": ["권리상담", "통역", "쉼터"], "상담료": 0, "평점": 4.8, "검증": True},
    {"이름": "시흥이주민센터", "유형": "이주민센터", "기관": "NGO", "주소": "경기 시흥시 정왕동", "lat": 37.3450, "lng": 126.7333, "언어": ["베트남어", "태국어"], "전문": ["권리상담", "한국어 교육"], "상담료": 0, "평점": 4.6, "검증": True},
    {"이름": "평택이주민센터", "유형": "이주민센터", "기관": "NGO", "주소": "경기 평택시", "lat": 36.9921, "lng": 127.1129, "언어": ["베트남어", "캄보디아어"], "전문": ["권리상담", "산재 동행"], "상담료": 0, "평점": 4.7, "검증": True},
    # 영사관
    {"이름": "주한 베트남대사관", "유형": "영사관", "기관": "베트남 정부", "주소": "서울 종로구", "lat": 37.5798, "lng": 126.9784, "언어": ["베트남어"], "전문": ["체류 보호", "영사 보호"], "상담료": 0, "평점": 4.0, "검증": True},
]


def haversine_km(lat1, lng1, lat2, lng2):
    """두 GPS 좌표 간 거리(km)."""
    r = 6371
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


# ─── 헤더 ──────────────────────────────────────────────
st.markdown("# 🗺️ 다국어 전문가·기관 매칭")
st.markdown("### 모국어가 통하는 전문가가, 가까운 곳에.")
st.caption(
    "위치·언어·전문분야 기반으로 노무사·변호사·산재병원·이주민센터·영사관을 매칭합니다. "
    "외국인노동자지원센터 폐쇄(2024.1)로 사라진 오프라인 채널을 디지털로 대체합니다."
)

st.divider()

# ─── 검색 필터 ────────────────────────────────────────
st.markdown("## 🔍 검색 조건")

col1, col2, col3 = st.columns(3)
with col1:
    user_lang = st.selectbox(
        "내 모국어",
        ["베트남어", "네팔어", "캄보디아어", "미얀마어", "태국어", "영어"],
    )
with col2:
    expert_type = st.multiselect(
        "찾는 유형",
        ["노무사", "변호사", "산재병원", "이주민센터", "영사관"],
        default=["노무사", "산재병원", "이주민센터"],
    )
with col3:
    specialty = st.multiselect(
        "전문 분야",
        ["산재", "임금체불", "퇴직금", "체류 자격", "권리상담", "응급의료", "통역"],
        default=["산재"],
    )

col4, col5 = st.columns(2)
with col4:
    user_location_label = st.selectbox(
        "내 현재 위치",
        ["경기 안산시 (응우옌 반 안)", "충남 천안시 (비크람 라이)", "경남 거제시 (다라 솜낭)"],
    )
with col5:
    radius_km = st.slider("검색 반경 (km)", 5, 200, 50)

# 위치 매핑
loc_map = {
    "경기 안산시 (응우옌 반 안)": (37.3219, 126.8309),
    "충남 천안시 (비크람 라이)": (36.8151, 127.1139),
    "경남 거제시 (다라 솜낭)": (34.8806, 128.6211),
}
user_lat, user_lng = loc_map[user_location_label]

st.divider()

# ─── 검색 실행 ────────────────────────────────────────
filtered = []
for exp in EXPERTS:
    if user_lang not in exp["언어"]:
        continue
    if expert_type and exp["유형"] not in expert_type:
        continue
    if specialty and not any(s in exp["전문"] for s in specialty):
        continue
    distance = haversine_km(user_lat, user_lng, exp["lat"], exp["lng"])
    if distance > radius_km:
        continue
    exp_with_dist = {**exp, "거리(km)": round(distance, 1)}
    filtered.append(exp_with_dist)

# 거리 오름차순 정렬
filtered.sort(key=lambda x: x["거리(km)"])

# ─── 결과 ────────────────────────────────────────────
st.markdown(f"## 🎯 검색 결과 — {len(filtered)}명/곳 매칭")

if not filtered:
    st.warning(
        f"⚠️ 조건에 맞는 전문가가 없습니다. 검색 반경을 늘리거나 언어를 확인하세요. "
        f"(현재: {user_lang} 가능 + {', '.join(expert_type) or '전체'} + 반경 {radius_km}km)"
    )
else:
    st.success(
        f"✅ **{user_lang} 가능 전문가 {len(filtered)}명/곳**이 반경 {radius_km}km 이내에 있습니다."
    )

    # 지도 (Streamlit 내장 map)
    st.markdown("### 📍 지도")
    map_data = pd.DataFrame(
        [{"lat": e["lat"], "lon": e["lng"], "name": e["이름"]} for e in filtered]
        + [{"lat": user_lat, "lon": user_lng, "name": "📍 내 위치"}]
    )
    st.map(map_data, size=80)

    # 카드 목록
    st.markdown("### 📋 상세 목록 (거리 가까운 순)")

    for i, exp in enumerate(filtered, 1):
        with st.container(border=True):
            head_col, btn_col = st.columns([4, 1])
            with head_col:
                badge = "✅ 검증됨" if exp["검증"] else "⚠️ 미검증"
                fee = "무료" if exp["상담료"] == 0 else f"{exp['상담료']:,}원"
                st.markdown(
                    f"### {i}. {exp['이름']} <span style='color:#FF6B35'>· {exp['유형']}</span>",
                    unsafe_allow_html=True,
                )
                st.markdown(
                    f"📍 **{exp['주소']}** ({exp['거리(km)']}km) · "
                    f"🏢 {exp['기관']} · {badge}"
                )
                st.markdown(
                    f"🌐 **언어**: {', '.join(exp['언어'])}  |  "
                    f"⚖️ **전문**: {', '.join(exp['전문'])}  |  "
                    f"💰 **상담료**: {fee}  |  "
                    f"⭐ **평점**: {exp['평점']}/5.0"
                )
            with btn_col:
                st.button("📞 통화 + AI 통역", key=f"call_{i}", use_container_width=True, type="primary")
                st.button("📅 상담 예약", key=f"book_{i}", use_container_width=True)

# ─── 1350 / AI 통역 안내 ────────────────────────────────
st.divider()
st.markdown("## 📞 보조 채널 — AI 통역 직통")

col_a, col_b = st.columns(2)
with col_a:
    st.info(
        "**1350 고용노동부 콜센터**\n\n"
        "GPT-4o Realtime AI 통역으로 한국어↔모국어 양방향 중계.\n"
        "기존 1350의 다국어 통역 한계(평일 주간만, 일부 언어)를 24/7로 보완."
    )
    st.button("📞 1350 + AI 통역 시작", type="primary", use_container_width=True, key="call_1350")
with col_b:
    st.info(
        "**근로복지공단 1588-0075**\n\n"
        "산재 신청·심사 안내. AI 통역으로 모국어 직접 상담 가능."
    )
    st.button("📞 공단 + AI 통역 시작", use_container_width=True, key="call_kcomwel")

# ─── 푸터 ──────────────────────────────────────────────
st.divider()
st.caption(
    "🗺️ 전문가 매칭 · WorkBuddy KR PoC · "
    "데이터: 한국공인노무사회 · 근로복지공단 산재 지정 의료기관 명부 · 잔존 이주민센터 NGO 명부 · "
    f"현재 검색된 전문가 12명 모두 모킹 데이터입니다 (정식 단계: 200명+ 풀 구축)."
)
