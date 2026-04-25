"""프로파일 가중치 A* 경로 탐색 엔진.

AI/LLM 을 사용하지 않는다.  OSM 서브셋 엣지의 접근성 속성(단차·경사·폭)과
사용자 프로파일(휠체어 폭·회전반경·타입)을 조합해 **통행 가능성 + 비용**을
계산하고 `networkx.astar_path` 로 경로를 뽑는다.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Literal

import networkx as nx

from data import mock_graph

ProfileKind = Literal["manual", "power", "stroller", "silver_cart"]


@dataclass(frozen=True)
class Profile:
    """휠체어/유모차/실버카트 프로파일.

    Attributes:
        kind: 프로파일 종류.
        max_curb_cm: 허용 가능한 보도 단차(cm).
        max_slope_pct: 허용 가능한 경사(%).
        min_width_cm: 통과 가능한 최소 보도 폭(cm).
        width_cm: 휠체어 본체 폭(cm).
        turn_radius_cm: 최소 회전반경(cm).
        access_weight: A* 비용 함수의 접근성 항 가중치 α.
    """

    kind: ProfileKind
    max_curb_cm: float
    max_slope_pct: float
    min_width_cm: float
    width_cm: int
    turn_radius_cm: int
    access_weight: float = 2.0
    allow_stairs: bool = False


PROFILE_PRESETS: dict[ProfileKind, Profile] = {
    "manual": Profile(
        kind="manual",
        max_curb_cm=3.0,
        max_slope_pct=5.0,
        min_width_cm=90,
        width_cm=65,
        turn_radius_cm=90,
        access_weight=2.5,
    ),
    "power": Profile(
        kind="power",
        max_curb_cm=6.0,
        max_slope_pct=8.0,
        min_width_cm=85,
        width_cm=70,
        turn_radius_cm=110,
        access_weight=1.5,
    ),
    "stroller": Profile(
        kind="stroller",
        max_curb_cm=5.0,
        max_slope_pct=7.0,
        min_width_cm=80,
        width_cm=60,
        turn_radius_cm=80,
        access_weight=2.0,
    ),
    "silver_cart": Profile(
        kind="silver_cart",
        max_curb_cm=4.0,
        max_slope_pct=4.0,
        min_width_cm=75,
        width_cm=55,
        turn_radius_cm=70,
        access_weight=3.0,
    ),
}


STANDARD_PROFILE = Profile(
    kind="manual",
    max_curb_cm=99.0,
    max_slope_pct=99.0,
    min_width_cm=0.0,
    width_cm=0,
    turn_radius_cm=0,
    access_weight=0.0,
    allow_stairs=True,
)


@dataclass
class EdgeEval:
    """엣지 평가 결과."""

    length_m: float
    access: Literal["ok", "warn", "blocked"]
    reason: str = ""


@dataclass
class RouteResult:
    """A* 결과 번들."""

    path: list[str]
    total_length_m: float
    edge_colors: list[str] = field(default_factory=list)
    edge_access: list[str] = field(default_factory=list)


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """대권 거리(m)."""
    r = 6_371_000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def evaluate_edge(
    curb_cm: float,
    slope_pct: float,
    width_cm: float,
    surface: str,
    access: str,
    profile: Profile,
) -> EdgeEval:
    """프로파일 대비 엣지 통행 가능성 판정.

    실제 통행 불가(blocked) · 경고(warn) · 정상(ok)을 결정하고,
    그 근거를 사람이 읽을 수 있는 한 줄로 반환한다.
    """
    if surface == "stairs" and not profile.allow_stairs:
        return EdgeEval(length_m=0, access="blocked", reason="계단 구간")
    if curb_cm > profile.max_curb_cm:
        return EdgeEval(length_m=0, access="blocked", reason=f"단차 {curb_cm:.0f}cm 초과")
    if slope_pct > profile.max_slope_pct:
        return EdgeEval(length_m=0, access="blocked", reason=f"경사 {slope_pct:.1f}% 초과")
    if width_cm < profile.min_width_cm:
        return EdgeEval(length_m=0, access="blocked", reason=f"폭 {width_cm:.0f}cm 부족")

    # 원본 access 데이터가 warn 이면 유지, 프로파일 기준에 살짝 못 미치는 경우도 warn
    if access == "warn":
        return EdgeEval(length_m=0, access="warn", reason="보도 상태 주의")
    margin_curb = profile.max_curb_cm - curb_cm
    margin_slope = profile.max_slope_pct - slope_pct
    if margin_curb < 1.0 or margin_slope < 1.0:
        return EdgeEval(length_m=0, access="warn", reason="프로파일 여유 부족")
    return EdgeEval(length_m=0, access="ok", reason="")


def build_graph(profile: Profile) -> nx.Graph:
    """프로파일 필터가 적용된 networkx 그래프 빌드."""
    g = nx.Graph()
    for nid, lat, lon, label in mock_graph.nodes():
        g.add_node(nid, lat=lat, lon=lon, label=label)

    for u, v, length, curb, slope, width, surface, access in mock_graph.edges():
        ev = evaluate_edge(curb, slope, width, surface, access, profile)
        if ev.access == "blocked":
            continue  # 통행 불가 엣지는 그래프에서 제거

        # 비용 = 거리 + α × (1 - 접근성 점수) × 기준거리(100m)
        access_score = 1.0 if ev.access == "ok" else 0.4
        penalty = profile.access_weight * (1.0 - access_score) * 100.0
        cost = float(length) + penalty

        g.add_edge(
            u,
            v,
            length=float(length),
            cost=cost,
            access=ev.access,
            surface=surface,
            curb_cm=curb,
            slope_pct=slope,
            width_cm=width,
        )
    return g


def _heuristic(g: nx.Graph, a: str, b: str) -> float:
    """A* 휴리스틱 (대권 거리)."""
    la1, lo1 = g.nodes[a]["lat"], g.nodes[a]["lon"]
    la2, lo2 = g.nodes[b]["lat"], g.nodes[b]["lon"]
    return _haversine(la1, lo1, la2, lo2)


def _access_color(access: str) -> str:
    return {"ok": "#2ca02c", "warn": "#f1c40f", "blocked": "#e74c3c"}.get(access, "#888888")


def astar(profile: Profile, source: str, target: str) -> RouteResult | None:
    """프로파일이 적용된 A* 경로 탐색.

    Returns:
        경로 불가 시 None, 가능하면 `RouteResult`.
    """
    g = build_graph(profile)
    if source not in g or target not in g:
        return None
    try:
        path = nx.astar_path(
            g,
            source,
            target,
            heuristic=lambda a, b: _heuristic(g, a, b),
            weight="cost",
        )
    except nx.NetworkXNoPath:
        return None

    length = 0.0
    colors: list[str] = []
    accesses: list[str] = []
    for u, v in zip(path, path[1:]):
        data = g.edges[u, v]
        length += float(data["length"])
        colors.append(_access_color(data["access"]))
        accesses.append(data["access"])
    return RouteResult(
        path=path,
        total_length_m=length,
        edge_colors=colors,
        edge_access=accesses,
    )


def node_coord(nid: str) -> tuple[float, float] | None:
    """노드 좌표 조회."""
    for n, lat, lon, _ in mock_graph.nodes():
        if n == nid:
            return lat, lon
    return None


def node_label(nid: str) -> str:
    """노드 라벨 조회."""
    for n, _, _, label in mock_graph.nodes():
        if n == nid:
            return label
    return nid
