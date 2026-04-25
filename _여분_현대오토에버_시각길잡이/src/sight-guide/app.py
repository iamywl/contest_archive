"""시각길잡이 Streamlit PoC — 엔트리.

5 기능 중 Phase 1 우선 집합:
    - 기능 1 (YOLO 객체 인식)
    - 기능 3 (음성 안내 텍스트 + TTS)
    - 기능 5 (프라이버시 온디바이스 표기)

모든 추론은 로컬. 네트워크 차단 환경에서도 시연 가능해야 한다.
"""

from __future__ import annotations

import logging
from io import BytesIO
from pathlib import Path

import streamlit as st
from PIL import Image

from detection import Detection, draw_detections, run_inference
from guidance import build_guidance, count_summary, summarize
from ocr_crosswalk import read_crosswalk

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


APP_TITLE = "시각길잡이 (Sight Guide) · PoC"
APP_ICON = "🦯"


def main() -> None:
    """Streamlit 메인 레이아웃."""
    st.set_page_config(page_title=APP_TITLE, page_icon=APP_ICON, layout="wide")
    _sidebar()
    _home()


def _sidebar() -> None:
    with st.sidebar:
        st.header("모드 선택")
        st.session_state.setdefault("mode_upload", True)
        st.session_state.setdefault("mode_camera", False)
        st.session_state.setdefault("mode_crosswalk", False)

        st.session_state["mode_upload"] = st.checkbox(
            "이미지 업로드 (YOLO)", value=st.session_state["mode_upload"]
        )
        st.session_state["mode_camera"] = st.checkbox(
            "카메라 (라이브 촬영)", value=st.session_state["mode_camera"]
        )
        st.session_state["mode_crosswalk"] = st.checkbox(
            "횡단보도 잔여시간 OCR", value=st.session_state["mode_crosswalk"]
        )

        st.divider()
        st.caption(
            "모든 추론은 **온디바이스** 로컬 처리됩니다.\n"
            "프레임은 서버로 전송되지 않습니다."
        )
        st.caption("TTS: pyttsx3 (로컬) — 클라우드 TTS 사용 안 함.")


def _home() -> None:
    st.title(f"{APP_ICON} {APP_TITLE}")
    st.markdown(
        """
        **시각장애인을 위한 음성-only 보행 보조 데모.**
        카메라 또는 업로드된 사진을 로컬 YOLO v8n 으로 분석해
        장애물·보행 요소를 감지하고, 한국어 안내문을 로컬 TTS로 읽어줍니다.

        ### UX 원칙
        - **음성 only**: 화면 탭 최소, 안내 문장은 한 번의 짧은 문장으로.
        - **프라이버시**: 영상 프레임은 기기 밖으로 나가지 않습니다.
        - **오프라인 동작**: 네트워크 없이도 추론·음성 합성이 가능합니다.
        """
    )
    st.divider()

    if st.session_state.get("mode_upload"):
        _upload_section()
    if st.session_state.get("mode_camera"):
        _camera_section()
    if st.session_state.get("mode_crosswalk"):
        _crosswalk_section()


def _upload_section() -> None:
    st.subheader("이미지 업로드 모드")
    uploaded = st.file_uploader(
        "보행 장면 사진(JPG/PNG) 1장을 업로드하세요.",
        type=["jpg", "jpeg", "png"],
    )
    if not uploaded:
        st.info("샘플 이미지를 시험하려면 `samples/` 폴더의 파일을 업로드해보세요.")
        return

    image = Image.open(uploaded)
    _infer_and_render(image)


def _camera_section() -> None:
    st.subheader("카메라 모드")
    snap = st.camera_input("장면을 촬영하세요.")
    if snap is None:
        return
    image = Image.open(snap)
    _infer_and_render(image)


def _infer_and_render(image: Image.Image) -> None:
    with st.spinner("YOLO v8n 추론 중... (최초 실행 시 ~6MB 가중치 다운로드)"):
        try:
            detections = run_inference(image)
        except Exception as exc:  # noqa: BLE001 — demo path: surface the error.
            st.error(f"추론 실패: {exc}")
            return

    col_left, col_right = st.columns([3, 2])
    with col_left:
        annotated = draw_detections(image, detections)
        st.image(annotated, caption="감지 결과 (YOLO v8n)", use_container_width=True)

    with col_right:
        _render_guidance(detections, image.width, image.height)


def _render_guidance(
    detections: list[Detection], width: int, height: int
) -> None:
    st.markdown("### 감지 요약")
    st.write(count_summary(detections))

    st.markdown("### 한국어 음성 안내")
    sentences = build_guidance(detections, image_width=width, image_height=height)
    for sent in sentences:
        icon = {0: "🟢", 1: "🟡", 2: "🔴"}.get(sent.severity, "⚪")
        st.write(f"{icon} {sent.text}")

    final = summarize(detections, image_width=width, image_height=height)
    st.markdown("**재생될 안내문:**")
    st.code(final, language="text")

    if st.button("🔊 음성 재생 (로컬 TTS)", key="tts_btn"):
        _play_tts(final)


def _play_tts(text: str) -> None:
    try:
        from tts_engine import LocalTTSEngine

        engine = LocalTTSEngine(prefer="pyttsx3")
        result = engine.synthesize(text)
        st.audio(BytesIO(result.audio), format="audio/wav")
        st.caption(f"TTS 백엔드: {result.backend} · {result.sample_rate} Hz")
    except Exception as exc:  # noqa: BLE001 — demo path.
        st.error(f"TTS 실패: {exc}")
        st.caption(
            "로컬 TTS 미설치 시: `pip install pyttsx3` 또는 `pip install kokoro`"
        )


def _crosswalk_section() -> None:
    st.subheader("횡단보도 잔여시간 OCR (샘플)")
    st.caption("Tesseract 미설치 시 mock 값(보행 6초 남음)을 반환합니다.")

    uploaded = st.file_uploader(
        "횡단보도 신호 이미지를 업로드하세요 (선택).",
        type=["jpg", "jpeg", "png"],
        key="crosswalk_upload",
    )

    image_path: Path | None = None
    if uploaded is not None:
        image = Image.open(uploaded)
        st.image(image, caption="입력 이미지", use_container_width=True)
        tmp = Path("/tmp/crosswalk_input.png")
        image.save(tmp)
        image_path = tmp

    reading = read_crosswalk(image_path)
    severity = "🟢" if (reading.seconds or 0) >= 10 else "🟡"
    if reading.seconds is not None and reading.seconds < 4:
        severity = "🔴"

    st.metric(
        label=f"{severity} 잔여시간",
        value=f"{reading.seconds}초" if reading.seconds else "미검출",
        delta=f"source: {reading.source}",
    )
    st.write(f"안내문: **{reading.text}**")
    if st.button("🔊 횡단보도 안내 재생", key="tts_crosswalk"):
        _play_tts(reading.text)


if __name__ == "__main__":
    main()
