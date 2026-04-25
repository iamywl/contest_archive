# 수어톡 (SuEoTalk) — Streamlit PoC

> 청각장애인과 비장애인이 마주 보고 실시간 대화하는 양방향 통역 PoC.
> 모든 추론은 **온디바이스 로컬** 만 사용한다. 외부 AI API 호출 없음 (루트 CLAUDE.md §7 준수).

## 실행

```bash
cd src/sueotalk
uv sync                 # 또는 pip install -e .
streamlit run app.py
```

## 의존성 레이어

| 레이어 | 필수 | 옵션 |
|---|---|---|
| Core UI | `streamlit`, `pillow`, `numpy`, `httpx` | — |
| Vision | — | `mediapipe`, `opencv-python-headless` |
| STT | — | `faster-whisper` (또는 whisper.cpp CLI) |
| TTS | — | `pyttsx3` / Kokoro |

옵션 의존성 미설치 시 `mock` 백엔드로 자동 폴백하여 UI 시연은 가능하다.

## 화면

- **양방향 (분할)**: 청각장애인 측 ↔ 응대자 측 1폰 분할
- **수어 → 자막**: 이미지 업로드 → Holistic → KSL 500문장 매칭
- **음성 → 수어**: 한국어 WAV/MP3 → STT → KSL 자막 + SVG 아바타 키프레임

사이드바의 **상황 프리셋** (주민센터·병원·약국·은행·긴급·교통) 으로 버튼 1~3개로
연쇄 문장을 재생할 수 있어 심사 시연에 유리하다.

## 제한 사항

- 500문장 시드셋은 현재 60문장 수준. 추후 국립국어원 한국수어사전 전체를 로컬 번들로 확장.
- 3D 아바타는 SVG 키프레임으로 대체 중. Phase 2(Flutter)에서 glTF 자산 연동.
- 음성 합성은 `pyttsx3` 폴백 — Kokoro TTS 설치 시 자연스러운 한국어 재생.
