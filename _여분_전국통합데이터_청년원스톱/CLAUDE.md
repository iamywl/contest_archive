# CLAUDE.md — 청년원스톱 프로젝트 작업 지침

> 저장소 루트 [`../CLAUDE.md`](../CLAUDE.md) 와 공모전 상위 지침을 상속합니다.
> 본 문서는 `_여분_공유/templates/CLAUDE.md` v1 를 청년원스톱 규격으로 치환한 결과물입니다.

---

## 0. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 프로젝트명 | **청년원스톱 (Youth One-Stop)** |
| 공모전 | 2026 전국 통합데이터 활용 공모전 |
| 카테고리 | 청년정책·일자리·주거·금융 통합 매칭 |
| 타깃 | 만 19~39세 청년 + 청년센터 상담사 |
| 폴더 | `_여분_전국통합데이터_청년원스톱/` |
| 기준 머신 | MacBook Pro M4 Max · 128GB (저장소 루트 CLAUDE.md §7.3) |

---

## 1. 디렉터리 구조 (고정)

```
_여분_전국통합데이터_청년원스톱/
├── CLAUDE.md              ← 본 문서
├── 아이디어.md             ← 컨셉 한 장
├── 제안서.md               ← 심사 제출용 본문 (읽기 전용, 스택 규격)
├── docs/
│   ├── 개발계획서.md        ← 표 위주, §5 현재 상황 갱신 의무
│   ├── 개발보고서.md        ← 실 캡처 + 검토 체크리스트
│   └── screenshots/        ← Next.js 캡처 저장 위치
└── dev/
    └── youth-onestop/      ← Next.js 데모 앱 (App Router)
```

- 문서용(`docs/`)과 개발용(`dev/`)을 **섞지 않는다**.
- `제안서.md` 는 **기술 스택 규격의 원천**으로 취급한다. 구현과 괴리되면 제안서를 먼저 수정한다.

---

## 2. 작업 흐름 (매 세션)

```
1. 저장소 루트 CLAUDE.md §7 재확인 (로컬 LLM 전용, API 기반 AI 금지)
2. 본 문서 + 제안서.md 재확인 (제안서가 기술 스택 규격)
3. 작업 계획 수립 (TODO)
4. 코드/문서 변경
5. 실제 구동 → 캡처 (_여분_공유/scripts/capture.mjs 또는 수동)
6. 캡처 검토 → 의도와 다르면 수정·재캡처
7. docs/개발계획서.md §5 현재 상황 갱신 (last_updated YYYY-MM-DD)
8. docs/개발보고서.md 해당 섹션 갱신
9. 요소기능 단위 커밋 (기획·구조·UI·캡처 등 단위)
```

---

## 3. AI 스택 (로컬 전용)

| 용도 | 구현 | 참조 |
|---|---|---|
| LLM 추론 | Ollama **`large` → `devstral-2:123b`** (74GB, 긴 컨텍스트 RAG) | `_여분_공유/lib/local_llm.py` · `local-llm.ts` |
| 구조화 출력 | `outlines` 또는 `llama.cpp grammar` — JSON 스키마 강제 | 제안서 §2.2 (2) |
| 임베딩 | Ollama `nomic-embed-text` (로컬) | LocalLLM.embed() |
| 벡터 DB | **FAISS (로컬)** — 법제처 법령·시행령 인덱스 | 제안서 §5.1 |
| STT / TTS | (본 프로젝트 미사용) | - |

**LLM 운영 원칙**
- `devstral-2:123b` 는 **단독 로드**가 원칙이다. 다른 LLM 과 **동시 로드 금지** (메모리 74GB 단독 점유).
- 임베딩 서빙은 `nomic-embed-text` 를 별도 Ollama 세션으로 유지하되 RAM 여유(>= 24GB) 확인 후 병행한다.
- 전환 시 `ollama stop <model>` 으로 이전 모델 해제 → 신규 로드.

**금지**: `anthropic`, `openai`, `@anthropic-ai/sdk`, `@google/genai`, Cohere SDK 등 외부 AI API 클라이언트 일체. 제안서 본문에 남은 과거 표기도 구현·보고 단계에서 **로컬 모델로 정정**한다.

---

## 4. 공용 리소스 참조

모두 `_여분_공유/` 의 파일을 **참조**(복사 금지):

- 공공 API 프록시: `_여분_공유/lib/public-api-proxy.ts` (온통청년·고용24·LH·SH·HRD-Net·서민금융진흥원 공통 게이트웨이)
- a11y 토큰: `_여분_공유/tailwind-a11y.config.ts`
- 캡처 스크립트: `node _여분_공유/scripts/capture.mjs <baseUrl> docs/screenshots`
- Mock fixture: `_여분_공유/mock-fixtures/<api>.json` — 공공 API 키 미발급 시 폴백
- 로컬 LLM 래퍼: `_여분_공유/lib/local-llm.ts` — `/api/ai/match`, `/api/ai/draft` 에서 호출

---

## 5. 빌드·구동

### Next.js (App Router)

```bash
cd dev/youth-onestop
pnpm install
pnpm build   # 성공 필수 (TypeScript strict, ESLint 통과)
pnpm dev     # http://localhost:3000
```

### 로컬 LLM 기동

```bash
ollama serve &                    # 백그라운드
ollama run devstral-2:123b "hi"   # 최초 로드 확인 (~30초)
ollama pull nomic-embed-text      # 임베딩 모델
```

구동 → 캡처 → 검토의 순환이 **필수**. 캡처는 실제 `pnpm dev` 실행 후 `docs/screenshots/` 에 PNG 저장.

---

## 6. 5개 핵심 화면 (제안서 §2.2 (1))

| # | 화면 | 라우트 (예시) | 비고 |
|:--:|---|---|---|
| ① | 홈 (내 매칭) | `/` | 내 조건 카드 + Top 20 매칭 |
| ② | 정책 탐색 | `/policies` | 온통청년 전체 카테고리·마감 정렬 |
| ③ | 일자리·훈련 | `/jobs` | 고용24 + HRD-Net 교차 표시 |
| ④ | AI 신청서 | `/draft` | 로컬 LLM 초안 + 사용자 검수 |
| ⑤ | 마감 캘린더 | `/calendar` | 4종 통합 D-7/D-1 표시 |

---

## 7. 제출 DoD (Definition of Done)

- [ ] `CLAUDE.md` / `아이디어.md` / `제안서.md` / `docs/개발계획서.md` / `docs/개발보고서.md` 5종 존재
- [ ] `pnpm build` 1회 이상 성공
- [ ] Mock 모드로 공공 API 키 없이 5화면 시연 가능
- [ ] 실제 구동 캡처 PNG 5장+ (`docs/screenshots/`)
- [ ] 개발보고서 "의도/검토/조치" 체크리스트 완료
- [ ] 커밋에 Co-Authored-By: Claude 트레일러 0건
- [ ] 로컬 LLM 경로만 사용 (외부 AI SDK import 0건)

---

## 8. 절대 금지

- ❌ 클라우드 AI API (Claude/OpenAI/Gemini/Clova 등) 호출·SDK import
- ❌ `devstral-2:123b` 와 타 LLM 의 동시 로드
- ❌ 캡처 없이 "구현 완료" 보고
- ❌ mock 폴백 부재 (인증키 없을 때 화면 깨짐)
- ❌ 제안서 내용과 구현 괴리 (제안서가 규격, 다르면 제안서 먼저 수정)
- ❌ 주민번호 수집, 소득 원값 서버 전송 (소득은 범주형만)
- ❌ Co-Authored-By: Claude 커밋 트레일러

---

*`_여분_전국통합데이터_청년원스톱/CLAUDE.md` · v1 · 2026-04-22*
