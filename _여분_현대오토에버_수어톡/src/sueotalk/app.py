"""수어톡 (SuEoTalk) Streamlit PoC.

제안서 §6 기준 기능 집합:
    1. 양방향 1폰 모드 — 분할 UI: 상단 수어→자막, 하단 음성→아바타
    2. KSL 500문장 프리셋 매칭 — mock_from_filename / MediaPipe Holistic
    3. 관공서·병원 상황 프리셋 — 버튼 1~3개로 연쇄 문장
    4. 오프라인 동작 — whisper.cpp / faster-whisper / mock 순 폴백
    5. 프라이버시 — 모든 추론 로컬, 원본 프레임 외부 전송 없음

루트 CLAUDE.md §7 준수: Ollama·whisper.cpp·MediaPipe 등 로컬 추론만 사용.
"""

from __future__ import annotations

import logging
import tempfile
from io import BytesIO
from pathlib import Path

import streamlit as st
from PIL import Image

from avatar import AvatarFrame, animation_available, render_frames
from holistic import HolisticResult, extract, gloss_candidate
from ksl_dictionary import KSLEntry, categories, filter_by_category, load_dictionary, search
from presets import SCENARIOS, ScenarioPreset
from stt_runner import transcribe

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

APP_TITLE = "수어톡 (SuEoTalk) · PoC"
APP_ICON = "🤟"


def main() -> None:
    st.set_page_config(page_title=APP_TITLE, page_icon=APP_ICON, layout="wide")
    _sidebar()
    st.title(f"{APP_ICON} {APP_TITLE}")
    st.caption(
        "청각장애인 ↔ 비장애인 1폰 양방향 통역 PoC — 모든 추론은 **온디바이스 로컬**."
    )
    st.divider()

    mode = st.session_state.get("mode", "split")
    if mode == "split":
        _split_mode()
    elif mode == "sign":
        _sign_to_text_block()
    elif mode == "voice":
        _voice_to_sign_block(st.container())


def _sidebar() -> None:
    with st.sidebar:
        st.header("모드")
        st.session_state.setdefault("mode", "split")
        mode_label = st.radio(
            "사용 모드 선택",
            options=["split", "sign", "voice"],
            format_func=lambda v: {
                "split": "🔀 양방향 (분할)",
                "sign": "👋 수어 → 자막",
                "voice": "🎙️ 음성 → 수어",
            }[v],
            index=["split", "sign", "voice"].index(st.session_state["mode"]),
        )
        st.session_state["mode"] = mode_label

        st.divider()
        st.header("상황 프리셋")
        for preset in SCENARIOS:
            if st.button(f"{preset.icon} {preset.name}", key=f"preset_{preset.name}"):
                st.session_state["active_preset"] = preset
                st.session_state["preset_index"] = 0

        st.divider()
        st.caption(
            "📦 **로컬 전용 스택**\n"
            "- MediaPipe Holistic (옵션)\n"
            "- faster-whisper / whisper.cpp (옵션)\n"
            "- 모두 미설치 시 mock 모드로 시연 가능"
        )


def _split_mode() -> None:
    st.subheader("🔀 양방향 1폰 모드")
    st.markdown(
        "화면을 상하로 반 나눈 뒤 청각장애인 측은 상단, 대화 상대는 하단을 본다.\n"
        "**회전**: 실제 앱에서는 분할된 영역이 각기 다른 방향으로 렌더링된다 (제안서 §4 ①)."
    )

    upper = st.container()
    st.markdown("---")
    lower = st.container()

    with upper:
        st.markdown("### 📱 상단 — 청각장애인 측: 음성 → 수어 자막")
        _voice_to_sign_block(upper)

    with lower:
        st.markdown("### 💬 하단 — 응대 직원 측: 수어 → 한국어 자막")
        _sign_to_text_block()


def _sign_to_text_block() -> None:
    """수어 → 한국어 자막."""
    st.markdown(
        "사진 1장 또는 짧은 영상(추후)으로 수어 포즈를 추출해 "
        "KSL 500문장 프리셋 중 가장 유사한 문장을 제시한다."
    )

    uploaded = st.file_uploader(
        "수어 장면 이미지를 업로드하세요. (JPG / PNG)",
        type=["jpg", "jpeg", "png"],
        key="sign_uploader",
    )

    active_preset: ScenarioPreset | None = st.session_state.get("active_preset")
    active_index: int = int(st.session_state.get("preset_index", 0))
    if active_preset is not None:
        entry = _entry_from_preset(active_preset, active_index)
        if entry is not None:
            st.info(f"**[{active_preset.name}]** 시나리오 {active_index+1}/{len(active_preset.sentence_ids)}")
            _render_sign_result_from_entry(entry)
            if active_index + 1 < len(active_preset.sentence_ids):
                if st.button("➡️ 다음 문장", key="sign_preset_next"):
                    st.session_state["preset_index"] = active_index + 1
                    st.rerun()
            else:
                if st.button("🔁 시나리오 초기화", key="sign_preset_reset"):
                    st.session_state.pop("active_preset", None)
                    st.session_state["preset_index"] = 0
                    st.rerun()

    if not uploaded:
        if active_preset is None:
            st.caption("이미지를 업로드하거나 왼쪽 사이드바에서 상황 프리셋을 선택하세요.")
        return

    image = Image.open(uploaded).convert("RGB")
    st.image(image, caption="입력 프레임", use_container_width=True)

    with st.spinner("Holistic 포즈 추출 중..."):
        holistic: HolisticResult = extract(image)

    col_a, col_b = st.columns(2)
    with col_a:
        st.markdown("**포즈 요약**")
        st.write(holistic.summary)
        st.code(f"backend = {holistic.backend}")
    with col_b:
        gloss = gloss_candidate(holistic)
        st.markdown("**휴리스틱 gloss**")
        st.write(gloss)

    # 파일명에서 한국어 추출 → 프리셋 검색.
    query = Path(uploaded.name).stem
    matches = search(query)
    if not matches:
        matches = search(gloss)

    st.markdown("### 📋 프리셋 매칭 결과 (Top 5)")
    if not matches:
        st.warning("매칭되는 500문장 프리셋이 없어 필담 폴백을 권장합니다.")
        return
    for entry, score in matches:
        with st.expander(f"[{entry.category}] {entry.ko} · score={score:.2f}"):
            _render_sign_result_from_entry(entry)


def _voice_to_sign_block(container) -> None:
    container.markdown(
        "한국어 음성(WAV/MP3) 업로드 → 로컬 STT → KSL 문장 매칭 → 아바타 키프레임 재생.\n"
        "STT 백엔드: faster-whisper → whisper.cpp → mock 순."
    )

    audio = container.file_uploader(
        "한국어 음성 파일을 업로드하세요. (WAV / MP3 / M4A)",
        type=["wav", "mp3", "m4a", "ogg"],
        key="voice_uploader",
    )

    text_input = container.text_input(
        "또는 문장을 직접 입력",
        key="voice_text_input",
        placeholder="예: 주민등록등본 발급받고 싶어요",
    )

    transcript: str | None = None
    backend: str = ""

    if audio is not None:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{audio.name.split('.')[-1]}") as tmp:
            tmp.write(audio.read())
            tmp_path = Path(tmp.name)
        with container:
            with st.spinner("로컬 STT 실행 중..."):
                result = transcribe(tmp_path)
            transcript = result.text
            backend = result.backend
    elif text_input:
        transcript = text_input
        backend = "직접 입력"

    if not transcript:
        container.caption("음성 파일을 업로드하거나 직접 문장을 입력하세요.")
        return

    container.success(f"전사 결과 · {backend}\n\n**{transcript}**")

    matches = search(transcript)
    if not matches:
        container.warning("500문장 프리셋과 매칭되지 않아 필담 폴백을 권장합니다.")
        return

    best, score = matches[0]
    container.markdown(f"### 🎯 선택된 문장 · score={score:.2f}")
    _render_avatar_block(best, container)


def _render_sign_result_from_entry(entry: KSLEntry) -> None:
    st.markdown(f"**자막**: `{entry.ko}`")
    st.markdown(f"- 카테고리: **{entry.category}**")
    st.markdown(f"- Gloss: {entry.gloss}")
    st.markdown(f"- 수형 설명: {entry.hand}")


def _render_avatar_block(entry: KSLEntry, container) -> None:
    container.markdown(f"**자막**: `{entry.ko}` · 카테고리 **{entry.category}**")
    frames: list[AvatarFrame] = render_frames(entry, frames=4)
    cols = container.columns(len(frames))
    for col, frame in zip(cols, frames):
        with col:
            st.markdown(frame.svg, unsafe_allow_html=True)
            st.caption(frame.caption)

    if animation_available(entry):
        container.info("✅ glTF 애니메이션 자산 탑재됨")
    else:
        container.caption(
            "ℹ️ 실제 glTF 자산은 Phase 2(Flutter) 단계에서 추가. "
            "현재 PoC는 SVG 키프레임으로 대체 재생한다."
        )

    if container.button("🔊 한국어 TTS 재생 (시도)", key=f"tts_{entry.id}"):
        _play_tts(entry.ko, container)


def _play_tts(text: str, container) -> None:
    try:
        import pyttsx3  # noqa: F401
        import io
        import wave

        # pyttsx3 는 stream을 직접 못 뽑는 경우가 있어 파일로 우회.
        engine = pyttsx3.init()
        tmp = Path(tempfile.gettempdir()) / "sueotalk_tts.wav"
        engine.save_to_file(text, str(tmp))
        engine.runAndWait()
        if tmp.exists():
            buf = BytesIO(tmp.read_bytes())
            container.audio(buf, format="audio/wav")
        else:
            container.caption("pyttsx3 WAV 저장 실패 — Kokoro / XTTS 로 대체 필요")
    except Exception as exc:
        logger.warning("TTS 실패: %s", exc)
        container.caption(f"TTS 미설치: {exc}")


def _entry_from_preset(preset: ScenarioPreset, index: int) -> KSLEntry | None:
    """프리셋 순서에 맞는 KSL 엔트리 조회."""
    if index < 0 or index >= len(preset.sentence_ids):
        return None
    target_id = preset.sentence_ids[index]
    for entry in load_dictionary():
        if entry.id == target_id:
            return entry
    return None


if __name__ == "__main__":
    main()
