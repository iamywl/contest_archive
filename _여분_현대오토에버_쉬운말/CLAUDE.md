# CLAUDE.md — 쉬운말 (Easy-Read) 프로젝트 작업 지침

> 본 문서는 `_여분_공유/templates/CLAUDE.md` 템플릿을 기반으로 생성했다.
> 저장소 루트 [`../CLAUDE.md`](../CLAUDE.md) 및 공모전 상위 지침 [`../현대오토에버_배리어프리/CLAUDE.md`](../현대오토에버_배리어프리/CLAUDE.md) 를 **상속**한다.
> 충돌 시 우선순위: 저장소 루트 > 공모전(현대오토에버_배리어프리) > 본 문서.

---

## 0. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 프로젝트명 | **쉬운말 (Easy-Read)** |
| 공모전 | 2026 현대오토에버 배리어프리 앱 개발 콘테스트 |
| 카테고리 | 발달장애 · 정보접근 권익신장 |
| 타깃 | 등록 발달장애인 약 25만 명 + 저문해 노인 + 한글 미숙 다문화 가정 |
| 폴더 | `_여분_현대오토에버_쉬운말/` |
| 슬러그 | `easy-read` |
| 제출 마감 | **2026-05-17 (D-25)** |
| 기준 머신 | MacBook Pro M4 Max · 128GB (저장소 루트 CLAUDE.md §7.3) |

---

## 1. 디렉터리 구조 (고정)

```
_여분_현대오토에버_쉬운말/
├── CLAUDE.md              ← 본 문서
├── 아이디어.md             ← 컨셉 한 장
├── 제안서.md               ← 심사 제출용 본문 (읽기 전용, 스택 규격)
├── docs/
│   ├── 개발계획서.md        ← 표 위주, §5 현재 상황 갱신 의무
│   ├── 개발보고서.md        ← 실 캡처 + 검토 체크리스트 (추후 작성)
│   └── captures/           ← Streamlit 실 구동 PNG
└── src/
    └── easy-read/          ← Streamlit PoC (OCR → LLM 쉬운글 → 픽토그램 → TTS)
        ├── app.py
        ├── pipeline/
        │   ├── ocr.py
        │   ├── structurize.py
        │   ├── easy_rewrite.py
        │   ├── pictogram.py
        │   ├── highlight.py
        │   └── tts.py
        ├── assets/
        │   └── arasaac/    ← 로컬 픽토그램 CC 리소스
        ├── prompts/
        │   └── koddi_easy_korean.md
        ├── pyproject.toml
        └── README.md
```

> 새 파일은 위 구조 내에 배치한다. 루트에 잡파일 금지.
> `src/easy-read/` 외부에 코드 산재 금지. `docs/` 외부에 문서 산재 금지.

---

## 2. 작업 흐름 (매 세션)

```
1. 저장소 루트 CLAUDE.md §7 (로컬 LLM 전용, API 기반 AI 금지) 재확인
2. 공모전 상위 CLAUDE.md + 본 문서 + 제안서.md 재확인 (제안서가 기술 스택 규격)
3. TODO 수립 (D-25, 제출 2026-05-17)
4. 코드/문서 변경
5. 실제 구동 → 캡처 (수동 또는 Playwright/Streamlit 스크린샷)
6. 캡처 검토 → 의도와 다르면 수정·재캡처
7. docs/개발계획서.md §5 현재 상황 갱신 (last_updated: YYYY-MM-DD HH:MM)
8. docs/개발보고서.md 해당 섹션 갱신
9. 요소기능 단위 커밋 (기획·구조·UI·캡처 등 단위)
```

---

## 3. AI 스택 (로컬 전용)

제안서 §8 규격을 그대로 따른다. 본 프로젝트의 모든 추론은 **오프라인 가능**해야 한다.

| 용도 | 권장 구현 | 선정 근거 |
|---|---|---|
| OCR | **PaddleOCR** 우선 · **Tesseract(한글 `kor`)** fallback | 한글 정확도, 로컬 동작 (제안서 §8, [^15]) |
| 문서 구조 파싱 | PyMuPDF + OpenCV (표·서명란 검출) | 로컬·오픈소스 |
| LLM (쉬운글 변환) | Ollama `ko` 별칭 → **`qwen2.5:32b-instruct-q4_K_M`** 기본 / `large` 별칭 → **`devstral-2:123b`** fallback | 한국어 쉬운말 품질·온디바이스·문서 서버 전송 없음 |
| 프롬프트 규격 | **KODDI 「쉬운 글 작성 가이드」** 프롬프트 주입 (`prompts/koddi_easy_korean.md`) | 제안서 §6 [^5] |
| 구조화 출력 | `outlines` 또는 `llama.cpp` grammar | 원문↔쉬운글 1:1 단락 JSON 강제 |
| 픽토그램 | **ARASAAC 로컬 세트 (CC-BY-NC-SA)** + 한국어 단어 임베딩(`nomic-embed-text`) | 공개 라이선스, 오프라인 매칭 |
| TTS (한국어) | **Kokoro TTS** 우선 · **Coqui XTTS-v2** fallback | 자연스러운 한국어, 오프라인 |
| 하이라이트 로직 | 정규식(금액/날짜) + LLM 구조화 출력(서명란·첨부) | 제안서 §6 기능 4 |
| 임베딩·RAG | `nomic-embed-text` (Ollama) + FAISS | 픽토그램 매칭, KODDI 가이드 RAG |

**LLM 별칭 정의** (`_여분_공유/lib/local_llm.py` 의 alias 해석과 일치):

| alias | 실제 모델 | 용도 |
|---|---|---|
| `ko` | `qwen2.5:32b-instruct-q4_K_M` | 한국어 쉬운글 변환 (기본) |
| `large` | `devstral-2:123b` | 복잡 문서 품질 보강 (128GB 한도 내) |
| `embed` | `nomic-embed-text` | 픽토그램·가이드 임베딩 |

**금지 의존성**: `anthropic`, `openai`, `@anthropic-ai/sdk`, `@google/genai`, Cohere/Mistral/Perplexity SDK 일체. `pyproject.toml` 에 포함 금지.

---

## 4. 공용 리소스 참조

모두 `_여분_공유/` 파일을 **참조**(복사 금지):

- 로컬 LLM 래퍼: `_여분_공유/lib/local_llm.py`
- 로컬 STT 래퍼: `_여분_공유/lib/local_stt.py` (본 프로젝트 미사용)
- 로컬 TTS 래퍼: `_여분_공유/lib/local_tts.py`
- Mock fixture: `_여분_공유/mock-fixtures/` (네트워크·모델 부재 시)
- 캡처: `node _여분_공유/scripts/capture.mjs <baseUrl> <outDir>` (Streamlit은 수동 스크린샷 + `pytest-playwright` 대체 가능)

---

## 5. 빌드·구동 (Streamlit PoC)

```bash
# 1. 모델 사전 로드 (한 번만)
ollama pull qwen2.5:32b-instruct-q4_K_M
ollama pull nomic-embed-text

# 2. 의존성 설치
cd src/easy-read
uv sync   # 또는 pip install -e .

# 3. 구동
ollama serve &          # 백그라운드 로컬 추론 서버
streamlit run app.py    # http://localhost:8501
```

**구동 → 캡처 → 검토**의 순환은 타협 불가.
API 키 부재·모델 부재 시에도 **mock 모드**로 최소 시연 가능해야 한다.

---

## 6. UX·a11y 규칙 (본 프로젝트 필수)

타깃 특성상 **인지 접근성**이 최우선이다.

| 항목 | 규칙 |
|---|---|
| 글자 크기 | 본문 최소 18pt, 쉬운글 요약 24pt |
| 문장 길이 | 쉬운글 단락당 **3문장 이하 · 능동태** (KODDI 가이드) |
| 원문 병기 | 쉬운글 옆에 **원문 항상 병기** (환각 검증, R1 대응) |
| 하이라이트 | 금액·날짜·서명·마감일은 **색상 + 아이콘** 이중 표시 |
| 픽토그램 | 매칭 신뢰도 낮으면 **아이콘 표시하지 않음** (오해 유발 방지) |
| TTS | 속도 조절(0.7x / 1.0x / 1.3x), 한 줄 하이라이트 동기화 |
| 확인 배너 | "AI가 만든 쉬운 글입니다. 중요한 결정 전 원문과 보호자를 확인하세요" **고정 표시** |
| 색 대비 | WCAG AA 이상 (4.5:1) |

---

## 7. 제출 DoD (Definition of Done) — D-25

- [ ] `CLAUDE.md` / `아이디어.md` / `제안서.md` / `docs/개발계획서.md` / `docs/개발보고서.md` 5종 존재
- [ ] Streamlit 빌드 1회 이상 성공 (`streamlit run app.py`)
- [ ] 5기능(OCR·쉬운글·픽토그램·하이라이트·TTS·보호자공유) 최소 mock 시연 가능
- [ ] 실제 구동 캡처 PNG 5장+ (`docs/captures/`)
- [ ] 개발보고서 체크리스트 7항목 모두 ✅
- [ ] 원문 병기·확인 배너 노출 확인 (R1 대응)
- [ ] **커밋 트레일러에 `Co-Authored-By: Claude` 0건**
- [ ] `.env` / API 키 하드코딩 0건, 외부 AI SDK 의존성 0건
- [ ] 네트워크 차단 상태에서 시연 가능 (오프라인 검증)

---

## 8. 위험 요약 (제안서 §11 + 본 프로젝트 추가)

| ID | 위험 | 대응 |
|---|---|---|
| R1 | **LLM 오역·환각** | **원문 병기 의무 + 사용자 확인 배너 고정** |
| R2 | 픽토그램 부적합 | 매칭 신뢰도 임계치 이하 시 미표시 |
| R3 | 손글씨 OCR 오류 | 사용자 편집 단계 + 보호자 공유 재확인 |
| R4 | 개인정보(문서 이미지) | 온디바이스 처리, 서버 저장 기본 OFF |
| R5 | D-25 일정 압박 | 기능 우선순위 고정: OCR→쉬운글→하이라이트→픽토그램→TTS→공유 |

---

## 9. 절대 금지

- ❌ 클라우드 AI API (Claude/OpenAI/Gemini/Clova/Papago 등)
- ❌ 원문 미병기 상태로 쉬운글만 단독 표시 (R1 환각 치명)
- ❌ 캡처 없이 "구현 완료" 보고
- ❌ mock 폴백 부재 (모델·네트워크 부재 시 시연 실패)
- ❌ 제안서 내용과 구현 괴리 (제안서 §8이 규격, 다르면 제안서 먼저 수정)
- ❌ `Co-Authored-By: Claude` 커밋 트레일러
- ❌ ARASAAC 라이선스 위반(CC-BY-NC-SA, 출처·비상업·동일조건 표기 누락)
- ❌ 사용자 문서 이미지 외부 전송 (개인정보 원칙 위반)

---

*쉬운말 · CLAUDE.md · v1 · 2026-04-22*
