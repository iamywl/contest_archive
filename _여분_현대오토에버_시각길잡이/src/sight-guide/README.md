# 시각길잡이 (Sight Guide) — Streamlit PoC

시각장애인을 위한 **온디바이스** 보행 보조 웹 데모. YOLO v8n 으로 카메라/업로드 이미지에서
장애물·보행 요소를 감지하고, 한국어 안내문을 로컬 TTS(pyttsx3 / Kokoro)로 읽어준다.

## 설치

```bash
cd src/sight-guide
uv sync   # 또는: pip install -e .
```

선택 의존성:

```bash
pip install -e ".[ocr]"   # 횡단보도 잔여시간 OCR (Tesseract)
pip install -e ".[stt]"   # whisper.cpp 계열 STT
pip install -e ".[tts]"   # Kokoro 고품질 한국어 TTS
```

## 실행

```bash
streamlit run app.py
```

브라우저에서 `http://localhost:8501` 열고:

1. **이미지 업로드 모드** — 사진 1장 → YOLO 추론 → 감지 박스 + 한국어 안내문.
2. **TTS 재생** — 로컬 pyttsx3 로 안내문 음성 출력 (오프라인).
3. **횡단보도 샘플** — 잔여시간 OCR 데모 (Tesseract 미설치 시 mock "보행 6초 남음").

## 동작 원칙

- **완전 오프라인**. 네트워크 차단 환경에서도 시연 가능.
- **온디바이스 추론**. 프레임은 서버로 전송되지 않는다.
- **클라우드 TTS 금지**. pyttsx3(로컬) 또는 Kokoro(로컬)만 사용.

## 구조

```
src/sight-guide/
├── pyproject.toml
├── app.py              ← Streamlit 엔트리
├── detection.py        ← YOLO 추론 + 바운딩 박스
├── guidance.py         ← 감지 결과 → 한국어 안내문 규칙
├── tts_engine.py       ← pyttsx3 래퍼 (Kokoro fallback)
├── ocr_crosswalk.py    ← 횡단보도 잔여시간 OCR (mock 지원)
└── samples/            ← 샘플 이미지·assets
```
