"""AAC 심볼 그리드 — Streamlit 버튼 격자 렌더러.

실제 ARASAAC 이미지를 가져오는 대신 MVP에서는 이모지 + 한국어 라벨 버튼으로 대체한다.
`data/symbols.json` 의 각 심볼은 `{"emoji": str, "label": str, "ko": str}` 형태.
"""

from __future__ import annotations

from typing import Callable

import streamlit as st


def render_grid(
    symbols: list[dict[str, str]],
    *,
    columns: int = 4,
    on_pick: Callable[[dict[str, str]], None] | None = None,
    key_prefix: str = "sym",
) -> None:
    """심볼 그리드를 `columns` 열로 렌더.

    각 버튼은 이모지 + 라벨을 보여주고, 탭하면 `on_pick` 콜백을 호출한다.
    """
    if not symbols:
        st.info("선택된 프리셋에 등록된 심볼이 없습니다.")
        return

    cols = st.columns(columns)
    for idx, sym in enumerate(symbols):
        col = cols[idx % columns]
        label = f"{sym['emoji']}\n\n{sym['label']}"
        btn_key = f"{key_prefix}_{idx}_{sym['label']}"
        if col.button(label, key=btn_key, use_container_width=True):
            if on_pick is not None:
                on_pick(sym)


def render_sequence(sequence: list[dict[str, str]]) -> None:
    """탭한 심볼 시퀀스를 상단 띠로 표시."""
    if not sequence:
        st.caption("아직 선택한 심볼이 없습니다. 아래 그리드에서 심볼을 탭하세요.")
        return

    chips = "  ".join(f"{s['emoji']} {s['label']}" for s in sequence)
    st.markdown(
        f"<div style='font-size:1.6rem;padding:.6rem .8rem;border-radius:.6rem;"
        f"background:#FFF5D6;border:1px solid #E6C35A;'>{chips}</div>",
        unsafe_allow_html=True,
    )


__all__ = ["render_grid", "render_sequence"]
