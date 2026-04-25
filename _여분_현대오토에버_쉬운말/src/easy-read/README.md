# 쉬운말 (Easy-Read) — Streamlit PoC

> 공공문서 이미지를 **발달장애인·저문해 독자** 가 이해할 수 있게 변환하는 로컬 파이프라인.
> 모든 추론은 **온디바이스** (루트 CLAUDE.md §7 준수).

## 파이프라인

```
이미지/PDF 업로드
  ↓  (PaddleOCR → Tesseract → mock)
OCR 결과
  ↓  정규식·레이아웃 기반 구조화
Document (단락, 서명란, 금액·날짜·전화)
  ↓  Ollama `qwen2.5:32b` (format=json) → 규칙 기반 폴백
EasyDoc (쉬운 문장 + 픽토그램 키워드 + 경고)
  ↓
Streamlit UI (요약·단락·픽토그램·하이라이트·TTS)
```

## 실행

```bash
cd src/easy-read
uv sync                 # 또는 pip install -e .
ollama serve &          # 로컬 LLM 사용 시
ollama pull qwen2.5:32b-instruct-q4_K_M
streamlit run app.py
```

## 의존성 레이어

| 레이어 | 필수 | 옵션 |
|---|---|---|
| Core UI | `streamlit`, `pillow`, `numpy`, `httpx` | — |
| OCR | — | `paddleocr`, `paddlepaddle`, `pytesseract` |
| PDF | — | `pymupdf` |
| TTS | — | `pyttsx3`, `kokoro` (+ `soundfile`) |

옵션 의존성 없이도 샘플 문서(건강보험 고지서 / 과태료 / 민원서류) 로 전체 흐름 시연 가능.

## 프롬프트

`prompts/koddi_easy_korean.md` — KODDI 쉬운 글 작성 지침을 로컬 LLM 시스템 프롬프트로 각색.
JSON 스키마 강제(`format=json`) 로 파서 실패 최소화.

## 제한 사항

- ARASAAC SVG 원본은 라이선스 표기와 함께 별도 번들 필요. 현재는 emoji 폴백.
- OCR 정확도는 PaddleOCR(korean) 설치 시 급상승. 샘플 문서는 고정 텍스트로 우회.
- 규칙 기반 폴백은 최소 품질 보장용 — 실제 시연은 Ollama 로컬 LLM 권장.
