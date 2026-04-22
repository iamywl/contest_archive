# Contest Archive — 작업 지침

공모전 출품 작업 저장소의 공통 지침. 각 공모전 디렉터리에는 별도의 세부 지침이 있으며, 본 문서는 저장소 전체에 공통적으로 적용되는 원칙·코드 표준·작업 흐름을 정의한다.

새 작업을 시작하기 전, **본 문서 → 해당 공모전 디렉터리의 `CLAUDE.md`** 순서로 읽고 규칙을 적용한다.

---

## 1. 저장소 구조

```
contest_archive/
├── CLAUDE.md                              ← 본 공통 지침
├── README.md                              ← 저장소 개요
│
├── 2026_전국 통합데이터 활용 공모전 /
│   ├── CLAUDE.md                          ← 공모전별 세부 지침
│   ├── docs/                              ← 제안서·개발계획서·개발보고서
│   ├── dev/chekcin/                       ← Next.js 데모 앱
│   └── todo/                              ← 제출 전 체크리스트
│
└── 현대오토에버_배리어프리/
    ├── CLAUDE.md                          ← 공모전별 세부 지침
    ├── docs/                              ← 제안서·개발계획서·개발보고서
    └── src/ai-pipeline/                   ← Python STT→LLM→PDF 파이프라인
```

- 새 공모전은 **별도 최상위 디렉터리**로 분리하고, 그 내부에 `CLAUDE.md` · `docs/` · (코드가 있다면) `src/` 또는 `dev/`를 둔다.
- 루트에 잡파일을 두지 않는다.

---

## 2. 공통 작업 원칙

### 2.1 문서 작성
- **언어**: 한국어 (전문 용어는 원문 병기 허용)
- **포맷**: Markdown (`.md`)로만 작성. hwpx/PDF 변환은 **최종 제출 단계**에서만.
- **다이어그램**: Mermaid
- **링크**: 상대 경로 사용
- **이모지**: 섹션 식별용으로만. 남용 금지.

### 2.2 제안서류 데이터 정직성
- 모든 통계·인용·법적 주장은 1차 출처 각주로 뒷받침한다.
- 검증 안 된 수치는 **`[추정]`** 명시.
- 추정값과 공식 수치를 섞지 않는다.
- 조사 우선순위: 정부 통계 포털 → 부처 발표자료 → 공공기관 보고서 → 학술 논문 → 국제기구 → NGO 보고서.

### 2.3 개발 보고서 증거
- **실제 구동된 소프트웨어 캡처**로 증거를 남긴다. 목업·합성 이미지 금지.
- 캡처는 공모전 디렉터리 하위 `docs/captures/` 또는 `docs/screenshots/`에 저장.
- 캡처 → 검토 → 수정 → 재캡처 반복을 생략하지 않는다.

### 2.4 시크릿 관리
- API 키는 **절대 코드에 하드코딩 금지**.
- `.env` 파일 사용 + `.gitignore` 등록.
- 키 부재 시 **mock/모킹 모드**로 동작하게 설계 (데모 가능성 보장).

---

## 3. 코드 표준 (언어별)

저장소 전체에 적용. 공모전별 `CLAUDE.md`에서 추가 규칙을 둘 수 있으나 본 표준을 약화하지 않는다.

### 3.1 Python — **PEP 8 / PEP 257 / PEP 484**

| 범주 | 규칙 |
|---|---|
| 버전 | Python 3.11+ |
| 스타일 | PEP 8 (line length 100), `ruff` 기본 규칙 |
| Docstring | PEP 257 — 1줄 요약 + 필요 시 상세 |
| 타입 힌트 | PEP 484 — public 함수·메서드는 인자·반환 타입 명시 |
| 네이밍 | 함수·변수 `snake_case`, 클래스 `PascalCase`, 상수 `UPPER_SNAKE`, 모듈 `lower_snake` |
| Import | 표준 → 서드파티 → 로컬 순서, 그룹 간 빈 줄 1개. `isort` 호환 |
| 주석 | WHY만. WHAT은 코드가 설명하도록 |
| 예외 | bare `except:` 금지. 구체적 예외만 포착 |
| 문자열 | f-string 우선 |
| Path | `pathlib.Path` 우선, `os.path` 지양 |
| 로깅 | `logging` 모듈 사용, 디버그용 `print()` 남발 금지 |
| 패키지 | `pyproject.toml` + `pip` 또는 `uv` |
| 테스트 | `pytest`, 함수명 `test_`, AAA 구조(Arrange-Act-Assert) |

### 3.2 TypeScript / JavaScript

| 범주 | 규칙 |
|---|---|
| 런타임 | Node.js 20 LTS+ |
| 모듈 | ESM 우선, CommonJS 지양 |
| 스타일 | Prettier 기본값 + 프로젝트 ESLint 설정 |
| 네이밍 | 변수·함수 `camelCase`, 컴포넌트·타입·클래스 `PascalCase`, 상수 `UPPER_SNAKE`, 파일 `kebab-case` (React 컴포넌트는 `PascalCase.tsx`) |
| 타입 | `any` 금지. `unknown` 후 좁히기. public API는 명시적 타입 |
| Import | 절대 경로(`@/...`) 우선. 순환 참조 금지. 미사용 import 즉시 제거 |
| React | 함수형 컴포넌트만. Hook 의존성 배열 정확히 |
| 비동기 | `async/await` 우선, Promise 체이닝 지양 |
| 주석 | WHY만 |
| 테스트 | `*.test.ts(x)` 동위치, AAA 구조 |

### 3.3 Markdown

| 범주 | 규칙 |
|---|---|
| 표준 | CommonMark + GFM (표·체크박스·취소선) |
| 제목 | `#` 문서당 1개(문서 제목), 이하 계층 유지 |
| 줄바꿈 | 빈 줄로 단락 구분, `<br>` 최소화 |
| 코드블록 | 언어 태그 필수 (` ```python `, ` ```ts `, ` ```bash ` 등) |
| 링크 | 상대 경로. 한국어 링크 텍스트 허용 |
| 표 | 헤더 정렬(`:---`, `:---:`, `---:`) 명시 |

### 3.4 Shell / Bash

| 범주 | 규칙 |
|---|---|
| Shebang | `#!/usr/bin/env bash` |
| 안전 모드 | `set -euo pipefail` 상단 고정 |
| 변수 | `"$var"` 큰따옴표 인용, `${var}` 중괄호 권장 |
| 린트 | `shellcheck` 통과 |
| 오류 처리 | 실패 시 비-0 종료 코드 반환 |

### 3.5 JSON / YAML / TOML (설정 파일)

| 범주 | 규칙 |
|---|---|
| JSON | 2-space 들여쓰기, 마지막 콤마 금지 |
| YAML | 2-space 들여쓰기, 탭 금지. 문자열 인용 필요 시 큰따옴표 |
| TOML | 공식 스펙 준수. 섹션 구분 빈 줄 1개 |

---

## 4. Git / 커밋 원칙

- 커밋 메시지는 한국어 또는 영어 중 택1, 프로젝트 내 일관성 유지.
- 한 커밋 = 하나의 논리 단위. 대규모 재작성은 별도 커밋으로 쪼갠다.
- 생성된 의존성 디렉터리(`node_modules/`, `.venv/`, `__pycache__/`)는 커밋하지 않는다.
- 빌드 산출물(`.next/`, `dist/`, `*.tsbuildinfo`)은 커밋하지 않는다.
- `.DS_Store` 등 OS 생성 파일은 `.gitignore`로 차단.

---

## 5. 작업 흐름

큰 작업 단위마다:

```
1. 본 지침서 + 공모전별 CLAUDE.md 재확인
2. 작업 계획 수립 (TODO)
3. 코드/문서 변경
4. 코드 변경 시 → 실제 구동 → 캡처
5. 개발계획서 현재 상황 갱신
6. 의도와 다르면 → 수정 → 재구동 → 재캡처
7. 개발보고서 갱신 (캡처 포함)
8. TODO 완료 처리
```

---

## 6. 절대 하지 말 것

- ❌ 출처 없는 통계 인용
- ❌ 추정값을 사실로 표현
- ❌ 캡처 없이 "구현 완료" 보고
- ❌ API 키 하드코딩
- ❌ 검증 안 된 라이브러리 무분별 추가
- ❌ `docs/` 외부에 문서 산재
- ❌ `src/` 또는 `dev/` 외부에 코드 산재
- ❌ 의존성·빌드 산출물 커밋

---

## 7. AI 사용 제약 (여분 프로젝트 개발 시 필수 준수)

본 저장소의 **여분 프로젝트(`_여분_*`)** 개발 시 다음 제약을 엄격히 준수한다.
기존 제출 프로젝트(책크인·WorkBuddy KR·fintech)의 제안서 텍스트 상 API 기반 AI
언급은 기획 단계 서술이며, 실제 구현·데모는 본 제약을 따라 대체한다.

### 7.1 절대 금지 — API 기반 인공지능
- ❌ OpenAI API (GPT-4o, Whisper cloud, Embeddings API 등)
- ❌ Anthropic Claude API (Sonnet, Haiku, Opus)
- ❌ Google Gemini / Vertex AI API
- ❌ Azure OpenAI, AWS Bedrock 등 유료 클라우드 LLM 게이트웨이 일체
- ❌ Cohere·Mistral API·Perplexity API 등 유료 추론 서비스

이유: 데모 안정성(네트워크·과금·Rate Limit), 개인정보 보호, 오프라인 시연 가능성.

### 7.2 허용 — 로컬 LLM·로컬 ML
- ✅ **Ollama** (이미 설치됨, `/opt/homebrew/bin/ollama`)
  - 기존 로컬 모델: `devstral-2:123b` (74GB, 코드·추론), `nomic-embed-text:latest` (임베딩)
  - 추가 설치 가능: `llama3.3:70b`, `qwen2.5:72b`, `gemma3:27b`, `llama3.2-vision`, `deepseek-r1` 등
- ✅ **Apple MLX** (Apple Silicon 네이티브, Metal 가속)
  - `mlx-lm`, `mlx-vlm`, `mlx-whisper` 등
- ✅ **llama.cpp** (GGUF 양자화 모델)
- ✅ **whisper.cpp / faster-whisper / MLX Whisper** (로컬 STT)
- ✅ **Kokoro / Coqui XTTS / MeloTTS** (로컬 TTS)
- ✅ **PaddleOCR · Tesseract** (로컬 OCR)
- ✅ **MediaPipe · YOLO · Ultralytics** (로컬 비전, 온디바이스)
- ✅ **sentence-transformers + FAISS / pgvector** (로컬 임베딩·RAG)
- ✅ **Hugging Face Transformers** (로컬 추론 한정, `inference API` 호출 금지)

### 7.3 개발 머신 기준 사양

본 저장소의 개발·시연은 아래 단일 Mac에서 모두 가능해야 한다 (심사 환경 고려).

| 항목 | 사양 |
|---|---|
| 모델 | MacBook Pro (Mac16,6) |
| 칩 | **Apple M4 Max** (16코어: 성능 12 + 효율 4) |
| 메모리 | **128 GB 통합 메모리** |
| GPU | M4 Max 내장, Metal 3 |
| macOS | 15.7.4 (Sequoia) |
| 이미 보유한 로컬 스택 | Ollama, devstral-2:123b, nomic-embed-text |

모델 선정 기준:
- **단일 실행 RAM ≤ 90GB** (시스템 잔여 메모리 확보)
- **동시 실행 시 RAM 합 ≤ 100GB** (여러 데모 동시 구동 고려)
- Metal / MLX 가속 가능 모델 우선
- 양자화(Q4_K_M, Q5_K_M, 4bit MLX) 우선 검토

### 7.4 로컬 대체 매핑표

제안서 본문의 클라우드 AI 언급 → 실제 구현 시 반드시 아래로 치환한다.

| 제안서 상 | 실제 구현 |
|---|---|
| OpenAI Whisper API | **whisper.cpp** 또는 **MLX Whisper** (large-v3 권장) |
| Claude Sonnet / Haiku | **Ollama `devstral-2:123b`** (기본) 또는 `llama3.3:70b`, `qwen2.5:72b` |
| Claude Tool-use | **로컬 LLM + `llama.cpp grammar` 또는 `outlines` 제약 디코딩** |
| GPT-4o Realtime (음성) | **whisper.cpp streaming + llama.cpp + Kokoro TTS** 파이프라인 |
| Anthropic Embeddings | **nomic-embed-text** (Ollama) 또는 `BAAI/bge-m3` (MLX) |
| Clova Voice / Google TTS | **Kokoro TTS** (로컬, 한국어) 또는 **XTTS-v2** |
| Pinecone / 클라우드 벡터DB | **FAISS** (로컬) 또는 `pgvector` (Supabase local) |

### 7.5 문서 표기 원칙
- 여분 프로젝트 제안서의 스택 표는 **"로컬 LLM (devstral-2 / llama3.3)"** 으로 표기.
- 과거 제안서에 남아있는 "Claude Sonnet", "OpenAI Whisper" 등의 표기는 **개발보고서 작성 시 로컬 모델로 정정**하고 정정 이력을 명시.
- API 키 환경변수(`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`)는 여분 프로젝트에서 **생성·사용 금지**.

### 7.6 성능·배포 가이드
- **데모 모드 표준**: `ollama serve` 백그라운드 + Streamlit/Next.js 프론트 조합.
- 심사 환경에 로컬 모델 전달이 어려울 경우를 대비해 **사전 녹화 영상** 을 병행 준비.
- 모든 추론은 **오프라인 가능**해야 한다 (네트워크 차단 시 시연 가능).

---

*last_updated: 2026-04-22*
