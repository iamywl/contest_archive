# CLAUDE.md — 실버친구 프로젝트 작업 지침

> 본 문서는 `_여분_공유/templates/CLAUDE.md` 를 상속·치환한 프로젝트 지침입니다.
> 저장소 루트 [`../CLAUDE.md`](../CLAUDE.md) 와 공모전 [`../2026_전국 통합데이터 활용 공모전 /CLAUDE.md`](../2026_전국%20통합데이터%20활용%20공모전%20/CLAUDE.md) 를 상속합니다.
> 기술 스택의 진실 소스는 [`제안서.md`](제안서.md) 입니다. 구현이 제안서와 어긋나면 제안서를 먼저 수정합니다.

---

## 0. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 프로젝트명 | **실버친구 (Silver Friend)** |
| 공모전 | 2026 전국 통합데이터 활용 공모전 |
| 주관 | 행정안전부 · 한국지역정보개발원 |
| 카테고리 | 고령자 공공데이터 통합 생활지원 |
| 타깃 | 65세 이상 고령자 + 보호자 자녀 세대 |
| 폴더 | `_여분_전국통합데이터_실버친구/` |
| 슬러그 | `silver-friend` |
| 기준 머신 | MacBook Pro M4 Max · 128GB (저장소 루트 CLAUDE.md §7.3) |

한 줄 요약: "경로당 가는 길·버스·쉼터·자식 안심문자까지 한 화면. 어르신을 위한 공공데이터 통합 나들이 앱."

---

## 1. 디렉터리 구조 (고정)

```
_여분_전국통합데이터_실버친구/
├── CLAUDE.md              ← 본 문서
├── 아이디어.md             ← 컨셉 한 장
├── 제안서.md               ← 심사 제출용 본문 (기술 스택 규격, 읽기 전용)
├── docs/
│   ├── 개발계획서.md        ← 표 위주, §5 현재 상황 갱신 의무
│   ├── 개발보고서.md        ← 실 캡처 + 검토 체크리스트
│   └── screenshots/        ← Playwright 캡처 저장
└── dev/
    └── silver-friend/      ← Next.js 16 App Router 데모 앱
```

- 문서는 `docs/` 하위에만. 코드는 `dev/silver-friend/` 하위에만.
- 루트에 잡파일 금지.

---

## 2. 작업 흐름 (매 세션)

```
1. 저장소 루트 CLAUDE.md §7 재확인 (로컬 LLM 전용, API 기반 AI 금지)
2. 본 문서 + 제안서.md 재확인 (제안서가 기술 스택 규격)
3. 작업 계획 수립 (TodoWrite)
4. 코드/문서 변경
5. 실제 구동 → 캡처 (_여분_공유/scripts/capture.mjs 또는 수동)
6. 캡처 검토 → 의도와 다르면 수정·재캡처
7. 개발계획서 §5 현재 상황 갱신 (last_updated YYYY-MM-DD HH:MM)
8. 개발보고서 해당 섹션 갱신
9. 요소기능 단위 커밋 (기획·구조·UI·캡처 등 단위)
```

---

## 3. AI 스택 (로컬 전용)

저장소 루트 CLAUDE.md §7 준수. 본 프로젝트는 **모든 추론을 로컬에서 수행**하며 클라우드 AI API를 일체 호출하지 않는다.

| 용도 | 구현 | 참조 |
|---|---|---|
| LLM 추론 (chat · Tool-use) | Ollama `chat` → `llama3.3:70b-instruct-q4_K_M` | `_여분_공유/lib/local_llm.py` / `local-llm.ts` |
| 구조화 출력 | `outlines` 또는 `llama.cpp grammar` (JSON 스키마 강제) | - |
| STT (1차) | 브라우저 Web Speech API | - |
| STT (폴백) | whisper.cpp (large-v3) / MLX Whisper | `_여분_공유/lib/local_stt.py` |
| TTS | Kokoro (한국어, 로컬) | `_여분_공유/lib/local_tts.py` |
| 임베딩 | Ollama `nomic-embed-text` | `LocalLLM.embed()` |
| 벡터 DB | FAISS (로컬) 또는 pgvector | - |

### LLM 모델 해상도

- **Alias**: `chat`
- **Model**: `llama3.3:70b-instruct-q4_K_M`
- **예상 RAM**: 약 42GB (Q4_K_M) → 단일 로드 시 여유. 동시 로드는 `ollama stop` 후 교체.
- **사유**: 한국어 품질 + Tool-use(JSON) 안정성 + 128GB 메모리 여유.

**금지 의존성**: `anthropic`, `openai`, `@anthropic-ai/sdk`, `@google/genai`, Cohere SDK, Clova Voice 등 외부 AI API 클라이언트 일체.

---

## 4. 공용 리소스 참조

`_여분_공유/` 의 파일을 **참조**(복사 금지):

- 공공 API 프록시: `_여분_공유/lib/public-api-proxy.ts`
- 지도 컴포넌트: `_여분_공유/components/Map.tsx`
- 고령자 a11y 토큰: `_여분_공유/tailwind-a11y.config.ts`
- 캡처 스크립트: `node _여분_공유/scripts/capture.mjs http://localhost:3000 docs/screenshots`
- Mock fixture: `_여분_공유/mock-fixtures/<api>.json`

공공데이터 획득 시에는 제안서 §4 에 열거된 5종(경로당 · 무더위쉼터 · 저상버스 · 공원 · 보건소)을 우선 연결하고, 인증키 부재 시 mock fixture 로 폴백한다.

---

## 5. 빌드·구동

### Next.js (dev/silver-friend)

```bash
cd dev/silver-friend
pnpm install
pnpm build          # 성공 필수
pnpm dev            # 개발 서버 (3000)
```

### 로컬 LLM 선행 기동

```bash
ollama serve &                      # 백그라운드
ollama pull llama3.3:70b-instruct-q4_K_M
```

구동 → 캡처(`screenshots/`) → 검토 순환이 필수. 캡처 없이 "구현 완료" 보고 금지.

---

## 6. 고령자 UX 디폴트 (제안서 §2.2·§3.2 기반)

- **글자 크기**: 최소 18px (WCAG 2.2 AAA)
- **명암비**: 7:1 이상 디폴트
- **터치 영역**: 48×48dp 이상
- **컬러블라인드 친화**: 색 + 아이콘 이중 인코딩
- **옵션 모드**: 40대 이하 보호자용 "작은 글씨로 보기" 제공
- **음성 UI**: 홈에 큰 마이크 버튼, 응답은 Kokoro TTS 재생

UI 변경 시 위 항목을 체크리스트로 검증하고 개발보고서에 기록.

---

## 7. 제출 DoD (Definition of Done)

- [ ] `CLAUDE.md` / `아이디어.md` / `제안서.md` / `docs/개발계획서.md` / `docs/개발보고서.md` 5종 존재
- [ ] `pnpm build` 성공 1회 이상
- [ ] Mock 모드로 공공 API 키 없이 5대 화면 모두 시연 가능
- [ ] 실제 구동 캡처 PNG 5장 이상 (`docs/screenshots/`)
- [ ] 로컬 LLM(`llama3.3:70b-q4`) 실행 로그 1회 캡처
- [ ] 오프라인(네트워크 차단) 시연 영상 확보
- [ ] 커밋에 `Co-Authored-By: Claude` 트레일러 **0건**

---

## 8. 절대 금지

- ❌ 클라우드 AI API (Claude / OpenAI / Gemini / Clova 등)
- ❌ 캡처 없이 "구현 완료" 보고
- ❌ Mock 폴백 부재 (공공 API 키 없을 때 동작 실패)
- ❌ 제안서 내용과 구현 괴리 (제안서가 규격, 다르면 제안서 먼저 수정)
- ❌ `Co-Authored-By: Claude` 커밋 트레일러
- ❌ 보호자 휴대폰번호 등 PII 서버 평문 저장 (해시·클라이언트 보관 원칙)
- ❌ `_여분_공유/` 리소스 복사 (참조만)

---

*`_여분_전국통합데이터_실버친구/CLAUDE.md` · v1 · 2026-04-22*
