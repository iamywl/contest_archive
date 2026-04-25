"""WheelMap KR — Streamlit PoC 메인.

- 홈(프로파일): 수동/전동/유모차/실버카트 + 폭·회전반경 슬라이더
- 지도 & 경로: 서울 강남 미니 그래프 + 프로파일 기반 A* 경로 오버레이
- 사진 제보: 이미지 업로드 + 위치 선택 + 리포트 mock
- BF POI: 엘리베이터·장애인화장실 마커

AI / 외부 LLM 은 일절 사용하지 않는다.
"""

from __future__ import annotations

import folium
import streamlit as st
from folium.features import DivIcon
from streamlit_folium import st_folium

import poi as poi_mod
import reports as reports_mod
import routing

st.set_page_config(page_title="휠체어맵 KR · PoC", layout="wide", page_icon="♿")


# ---------------------------------------------------------------------------
# 세션 상태 초기화
# ---------------------------------------------------------------------------

_DEFAULT_PROFILE = "manual"

if "profile_kind" not in st.session_state:
    st.session_state.profile_kind = _DEFAULT_PROFILE
if "chair_width" not in st.session_state:
    st.session_state.chair_width = routing.PROFILE_PRESETS[_DEFAULT_PROFILE].width_cm
if "turn_radius" not in st.session_state:
    st.session_state.turn_radius = routing.PROFILE_PRESETS[_DEFAULT_PROFILE].turn_radius_cm
if "max_slope" not in st.session_state:
    st.session_state.max_slope = routing.PROFILE_PRESETS[_DEFAULT_PROFILE].max_slope_pct
if "max_curb" not in st.session_state:
    st.session_state.max_curb = routing.PROFILE_PRESETS[_DEFAULT_PROFILE].max_curb_cm


def _current_profile() -> routing.Profile:
    """세션 상태 → Profile 객체."""
    base = routing.PROFILE_PRESETS[st.session_state.profile_kind]
    return routing.Profile(
        kind=base.kind,
        max_curb_cm=float(st.session_state.max_curb),
        max_slope_pct=float(st.session_state.max_slope),
        min_width_cm=base.min_width_cm,
        width_cm=int(st.session_state.chair_width),
        turn_radius_cm=int(st.session_state.turn_radius),
        access_weight=base.access_weight,
    )


# ---------------------------------------------------------------------------
# 사이드바
# ---------------------------------------------------------------------------

st.sidebar.title("♿ 휠체어맵 KR")
st.sidebar.caption("AI 없음 · 그래프 가중치 + A* 탐색")
st.sidebar.markdown("---")
st.sidebar.markdown(
    "**현재 프로파일**\n\n"
    f"- 종류: `{st.session_state.profile_kind}`\n"
    f"- 폭: {st.session_state.chair_width} cm\n"
    f"- 회전반경: {st.session_state.turn_radius} cm\n"
    f"- 최대 경사: {st.session_state.max_slope:.1f} %\n"
    f"- 최대 단차: {st.session_state.max_curb:.1f} cm"
)


# ---------------------------------------------------------------------------
# 탭 구성
# ---------------------------------------------------------------------------

tab_home, tab_map, tab_report = st.tabs(["🏠 홈 · 프로파일", "🗺️ 지도 & 경로", "📷 사진 제보"])


# =========================================================================
# 홈 탭 — 프로파일 설정
# =========================================================================
with tab_home:
    st.header("1. 이동 프로파일 설정")
    st.markdown(
        "프로파일에 따라 경로 탐색의 **통행 가능/불가** 기준과 가중치가 자동 변경됩니다. "
        "모든 계산은 로컬 그래프 엔진(networkx) 기반이며 외부 AI 를 사용하지 않습니다."
    )

    profile_options = {
        "manual": "🦽 수동 휠체어",
        "power": "⚡ 전동 휠체어",
        "stroller": "👶 유모차",
        "silver_cart": "🛒 실버카트",
    }
    selected = st.radio(
        "프로파일",
        options=list(profile_options.keys()),
        format_func=lambda k: profile_options[k],
        horizontal=True,
        index=list(profile_options.keys()).index(st.session_state.profile_kind),
    )
    if selected != st.session_state.profile_kind:
        preset = routing.PROFILE_PRESETS[selected]
        st.session_state.profile_kind = selected
        st.session_state.chair_width = preset.width_cm
        st.session_state.turn_radius = preset.turn_radius_cm
        st.session_state.max_slope = preset.max_slope_pct
        st.session_state.max_curb = preset.max_curb_cm
        st.rerun()

    col1, col2 = st.columns(2)
    with col1:
        st.session_state.chair_width = st.slider(
            "휠체어 폭 (cm)", min_value=45, max_value=90, value=int(st.session_state.chair_width)
        )
        st.session_state.turn_radius = st.slider(
            "회전반경 (cm)", min_value=60, max_value=140, value=int(st.session_state.turn_radius)
        )
    with col2:
        st.session_state.max_slope = st.slider(
            "허용 최대 경사 (%)",
            min_value=2.0,
            max_value=12.0,
            value=float(st.session_state.max_slope),
            step=0.5,
        )
        st.session_state.max_curb = st.slider(
            "허용 최대 단차 (cm)",
            min_value=1.0,
            max_value=15.0,
            value=float(st.session_state.max_curb),
            step=0.5,
        )

    preset = routing.PROFILE_PRESETS[st.session_state.profile_kind]
    st.info(
        f"**프리셋 참고** — {profile_options[st.session_state.profile_kind]}: "
        f"기본 폭 {preset.width_cm}cm · 회전반경 {preset.turn_radius_cm}cm · "
        f"경사 {preset.max_slope_pct}% · 단차 {preset.max_curb_cm}cm · α={preset.access_weight}"
    )


# =========================================================================
# 지도 & 경로 탭
# =========================================================================
with tab_map:
    st.header("2. 지도 & 경로 탐색")

    node_options = [
        (nid, label) for nid, _, _, label in __import__("data.mock_graph", fromlist=["NODES"]).NODES
    ]
    id_to_label = dict(node_options)
    label_to_id = {v: k for k, v in id_to_label.items()}

    col_src, col_dst, col_btn = st.columns([3, 3, 1])
    with col_src:
        src_label = st.selectbox(
            "출발지",
            options=[label for _, label in node_options],
            index=0,
        )
    with col_dst:
        dst_label = st.selectbox(
            "도착지",
            options=[label for _, label in node_options],
            index=len(node_options) - 1,
        )
    src_id = label_to_id[src_label]
    dst_id = label_to_id[dst_label]

    profile = _current_profile()
    standard_route = routing.astar(routing.STANDARD_PROFILE, src_id, dst_id)
    profile_route = routing.astar(profile, src_id, dst_id)

    # ------ Folium 지도 렌더링 ------
    center_lat = sum(
        lat for _, lat, _, _ in __import__("data.mock_graph", fromlist=["NODES"]).NODES
    ) / len(node_options)
    center_lon = sum(
        lon for _, _, lon, _ in __import__("data.mock_graph", fromlist=["NODES"]).NODES
    ) / len(node_options)

    m = folium.Map(
        location=[center_lat, center_lon], zoom_start=15, tiles="OpenStreetMap"
    )

    # 노드 마커
    for nid, lat, lon, label in __import__("data.mock_graph", fromlist=["NODES"]).NODES:
        folium.CircleMarker(
            [lat, lon],
            radius=4,
            color="#333333",
            fill=True,
            fill_color="#ffffff",
            fill_opacity=1.0,
            tooltip=f"{nid} · {label}",
        ).add_to(m)

    # BF POI 마커
    for p in poi_mod.load_all():
        icon_name, icon_color = poi_mod.icon_for(p.category)
        folium.Marker(
            [p.lat, p.lon],
            popup=f"<b>{p.name}</b><br>{p.note}",
            tooltip=p.name,
            icon=folium.Icon(icon=icon_name, color=icon_color, prefix="fa"),
        ).add_to(m)

    def _draw_route(result: routing.RouteResult | None, color: str, label: str) -> None:
        if result is None:
            return
        # 전체 경로 (단색 — 표준/프로파일 구분용)
        coords = []
        for nid in result.path:
            c = routing.node_coord(nid)
            if c:
                coords.append(c)
        if coords:
            folium.PolyLine(
                coords, color=color, weight=6, opacity=0.45, tooltip=label
            ).add_to(m)

        # 엣지별 접근성 색상 오버레이 (🟢/🟡)
        for (u, v), col in zip(zip(result.path, result.path[1:]), result.edge_colors):
            cu = routing.node_coord(u)
            cv = routing.node_coord(v)
            if cu and cv:
                folium.PolyLine(
                    [cu, cv], color=col, weight=3, opacity=0.9
                ).add_to(m)

    _draw_route(standard_route, "#1f77b4", "표준 경로 (거리 최소)")
    _draw_route(profile_route, "#ff7f0e", "프로파일 경로 (접근성 가중)")

    # 출발/도착 마커
    src_coord = routing.node_coord(src_id)
    dst_coord = routing.node_coord(dst_id)
    if src_coord:
        folium.Marker(
            src_coord,
            icon=folium.Icon(color="green", icon="play", prefix="fa"),
            tooltip="출발",
        ).add_to(m)
    if dst_coord:
        folium.Marker(
            dst_coord,
            icon=folium.Icon(color="red", icon="flag", prefix="fa"),
            tooltip="도착",
        ).add_to(m)

    st_folium(m, height=560, width=None, returned_objects=[])

    # ------ 경로 요약 ------
    col_a, col_b = st.columns(2)
    with col_a:
        st.subheader("📐 표준 경로 (거리 최소)")
        if standard_route is None:
            st.error("경로 없음")
        else:
            st.metric("총 거리", f"{standard_route.total_length_m:,.0f} m")
            st.caption(" → ".join(routing.node_label(n) for n in standard_route.path))
    with col_b:
        st.subheader("♿ 프로파일 경로")
        if profile_route is None:
            st.error(
                "현재 프로파일로 도달 가능한 경로가 없습니다. "
                "프로파일 설정을 완화해 보세요 (허용 단차·경사 상향)."
            )
        else:
            st.metric("총 거리", f"{profile_route.total_length_m:,.0f} m")
            st.caption(" → ".join(routing.node_label(n) for n in profile_route.path))
            warn_cnt = sum(1 for a in profile_route.edge_access if a == "warn")
            ok_cnt = sum(1 for a in profile_route.edge_access if a == "ok")
            st.write(f"🟢 통행 OK 구간: **{ok_cnt}** · 🟡 주의 구간: **{warn_cnt}**")

    st.markdown(
        "**범례** · 🟢 통행 OK · 🟡 주의 · 🔴 통행 불가(프로파일 필터로 자동 제거) · "
        "🔵 표준 경로 · 🟠 프로파일 경로"
    )


# =========================================================================
# 사진 제보 탭
# =========================================================================
with tab_report:
    st.header("3. 사진 제보")
    st.caption(
        "고장·공사·장애물 사진 1탭 업로드 → 24시간 경로 제외 + 지자체 리포트 자동 발송 (Mock)."
    )

    uploaded = st.file_uploader(
        "현장 사진 (JPEG / PNG)", type=["jpg", "jpeg", "png"], accept_multiple_files=False
    )

    col_c, col_d = st.columns(2)
    with col_c:
        category = st.selectbox(
            "분류",
            options=[
                ("curb", "🚧 단차·턱"),
                ("stairs", "🪜 계단만 있는 구간"),
                ("construction", "🏗️ 공사"),
                ("elevator_broken", "⬆️ 엘리베이터 고장"),
                ("other", "❓ 기타"),
            ],
            format_func=lambda x: x[1],
        )[0]
        description = st.text_area("설명", placeholder="예: 출구 앞 보도 단차 8cm, 수동 휠체어 통과 불가")
    with col_d:
        lat = st.number_input("위도", value=37.5009, format="%.6f")
        lon = st.number_input("경도", value=127.0360, format="%.6f")
        st.caption("기본값은 역삼역 1번 출구입니다.")

    if st.button("📤 제보 업로드 (Mock)", disabled=uploaded is None):
        assert uploaded is not None
        report = reports_mod.save_report(
            image_bytes=uploaded.read(),
            filename=uploaded.name,
            category=category,
            lat=float(lat),
            lon=float(lon),
            description=description,
        )
        st.success(f"제보가 접수되었습니다 — `{report.report_id}`")
        st.code(reports_mod.render_municipal_report(report))
