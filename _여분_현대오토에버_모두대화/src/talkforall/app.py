"""모두대화 (Talk For All) — Streamlit PoC 엔트리.

핵심 화면 구성:
  • 상단   : 상황 프리셋 탭 (병원 / 학교 / 관공서 / 가족)
  • 중단   : 선택한 심볼 시퀀스 (누적 표시) + "문장 만들기" / "지우기"
  • 하단   : 4채널 출력 (심볼 시퀀스 · 예측 문장 · TTS · 수어 안내)

Ollama 미구동 시 mock 분기(단순 이어붙이기 + "요") 로 자동 폴백.
"""

from __future__ import annotations

import streamlit as st

from aac_grid import render_grid, render_sequence
from ksl import lookup as ksl_lookup
from predictor import predict_sentence
from presets import PRESETS, symbols_for
from tts import synthesize as tts_synthesize

st.set_page_config(
    page_title="모두대화 (Talk For All)",
    page_icon="🧩",
    layout="wide",
)

CUSTOM_CSS = """
<style>
  html, body, [class*="stApp"] { font-size: 18px; }
  .block-container { padding-top: 1.2rem; padding-bottom: 2rem; }
  .stButton>button {
    min-height: 84px; font-size: 1.1rem; line-height: 1.3;
    border-radius: .6rem; border: 1px solid #dcdcdc; white-space: pre-wrap;
  }
  .stButton>button:hover { border-color: #1E6FEB; }
</style>
"""
st.markdown(CUSTOM_CSS, unsafe_allow_html=True)


def _init_state() -> None:
    st.session_state.setdefault("preset", PRESETS[0].key)
    st.session_state.setdefault("sequence", [])
    st.session_state.setdefault("sentence", "")
    st.session_state.setdefault("sentence_source", "")


def _pick_symbol(symbol: dict[str, str]) -> None:
    st.session_state["sequence"].append(symbol)


def _clear_sequence() -> None:
    st.session_state["sequence"] = []
    st.session_state["sentence"] = ""
    st.session_state["sentence_source"] = ""


def _pop_last() -> None:
    if st.session_state["sequence"]:
        st.session_state["sequence"].pop()


def _generate_sentence() -> None:
    seq = st.session_state["sequence"]
    sentence, source = predict_sentence(seq)
    st.session_state["sentence"] = sentence
    st.session_state["sentence_source"] = source


def _render_presets_tabs() -> None:
    titles = [f"{p.emoji} {p.title}" for p in PRESETS]
    tabs = st.tabs(titles)
    for tab, preset in zip(tabs, PRESETS):
        with tab:
            st.caption(preset.description)
            grid = symbols_for(preset.key)
            render_grid(grid, columns=4, on_pick=_pick_symbol, key_prefix=preset.key)


def _render_four_channels() -> None:
    sentence = st.session_state["sentence"]
    source = st.session_state["sentence_source"]

    st.subheader("🔊 4채널 동시 출력")
    ch1, ch2 = st.columns(2)

    with ch1:
        st.markdown("**① 심볼 시퀀스**")
        if st.session_state["sequence"]:
            chips = " · ".join(
                f"{s['emoji']} {s['label']}" for s in st.session_state["sequence"]
            )
            st.write(chips)
        else:
            st.caption("비어있음")

        st.markdown("**② 예측 문장**")
        if sentence:
            badge = "LLM" if source == "llm" else "Mock"
            st.success(f"[{badge}] {sentence}")
        else:
            st.caption("'문장 만들기' 버튼을 눌러 생성하세요.")

    with ch2:
        st.markdown("**③ 음성 (TTS)**")
        if sentence:
            if st.button("🔊 이 문장 읽어주기", key="tts_play"):
                result = tts_synthesize(sentence)
                if result is None:
                    st.warning("로컬 TTS 백엔드를 찾지 못했거나 합성에 실패했습니다.")
                else:
                    audio_bytes, backend = result
                    st.audio(audio_bytes, format="audio/wav")
                    st.caption(f"백엔드: {backend}")
        else:
            st.caption("문장이 있어야 재생할 수 있습니다.")

        st.markdown("**④ 수어 안내 (KSL 30문장 프리셋 mock)**")
        if sentence:
            st.info(ksl_lookup(sentence))
        else:
            st.caption("문장이 있어야 수어 안내를 표시합니다.")


def main() -> None:
    _init_state()

    st.title("🧩 모두대화 (Talk For All)")
    st.caption(
        "AAC 심볼 + 한국어 예측 문장 + 4채널 동시 출력 PoC · "
        "ARASAAC CC 라이선스 · Ollama `gemma3:27b` 로컬"
    )

    _render_presets_tabs()

    st.divider()
    st.subheader("🗣️ 선택한 심볼 시퀀스")
    render_sequence(st.session_state["sequence"])

    btns = st.columns([1, 1, 1, 3])
    btns[0].button("✨ 문장 만들기", on_click=_generate_sentence, use_container_width=True)
    btns[1].button("⬅️ 마지막 지우기", on_click=_pop_last, use_container_width=True)
    btns[2].button("🧹 모두 지우기", on_click=_clear_sequence, use_container_width=True)

    st.divider()
    _render_four_channels()


if __name__ == "__main__":
    main()
