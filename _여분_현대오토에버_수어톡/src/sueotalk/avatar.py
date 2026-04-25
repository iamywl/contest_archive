"""3D 수어 아바타 재생 래퍼.

PoC 단계: glTF 모션 자산이 아직 없으므로 SVG 키프레임을 반환한다.
실제 glTF 자산이 추가되면 `data/ksl_anim/<id>.gltf` 경로로 확장.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from ksl_dictionary import KSLEntry


ASSETS_DIR = Path(__file__).parent / "assets" / "ksl_anim"


@dataclass
class AvatarFrame:
    """SVG 키프레임 한 장. PoC에서는 body/hand 벡터 한 묶음."""

    index: int
    caption: str
    svg: str


def render_frames(entry: KSLEntry, frames: int = 4) -> list[AvatarFrame]:
    """KSL 엔트리를 키프레임 리스트로 변환. glTF 자산 없을 때 휴리스틱."""
    hands = entry.hand.split("+")
    out: list[AvatarFrame] = []
    for i in range(frames):
        t = i / max(frames - 1, 1)
        dx = 30 * (0.5 - t) * 2
        dy = -20 * t + 10
        svg = _body_svg(dx=dx, dy=dy, hand_count=len(hands))
        out.append(
            AvatarFrame(
                index=i,
                caption=f"{i+1}/{frames} · {hands[min(i, len(hands)-1)]}",
                svg=svg,
            )
        )
    return out


def _body_svg(dx: float, dy: float, hand_count: int) -> str:
    right_hand = (
        f'<circle cx="{120 + dx}" cy="{150 + dy}" r="12" fill="#0ea5e9" opacity="0.9"/>'
    )
    left_hand = (
        f'<circle cx="{80 - dx}" cy="{160 - dy}" r="12" fill="#f97316" opacity="0.9"/>'
        if hand_count >= 2
        else ""
    )
    return f"""<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="수어 아바타">
        <rect width="200" height="240" fill="#0f172a"/>
        <circle cx="100" cy="50" r="22" fill="#e2e8f0"/>
        <rect x="78" y="78" width="44" height="70" rx="10" fill="#cbd5f5"/>
        {right_hand}
        {left_hand}
    </svg>"""


def animation_available(entry: KSLEntry) -> bool:
    """실제 glTF 자산 존재 여부."""
    return (ASSETS_DIR / f"{entry.id}.gltf").exists()
