# CLAUDE.md — 런메이트 프로젝트 작업 지침

> 저장소 루트 [`../CLAUDE.md`](../CLAUDE.md) 와 공모전
> [`../2026_전국 통합데이터 활용 공모전 /CLAUDE.md`](../2026_전국%20통합데이터%20활용%20공모전%20/CLAUDE.md) 를 상속합니다.
> 본 문서는 `_여분_공유/templates/CLAUDE.md` v1 을 런메이트 규격으로 치환한 것입니다.

---

## 0. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 프로젝트명 | **런메이트 (Run Mate)** |
| 공모전 | 2026 전국 통합데이터 활용 공모전 |
| 카테고리 | 생활체육 러닝 + 공영자전거 통합 |
| 타깃 | 20~40대 생활체육 러너 + 러닝 크루 |
| 폴더 | `_여분_전국통합데이터_런메이트/` |
| 슬러그 | `run-mate` |
| 기준 머신 | MacBook Pro M4 Max · 128GB (저장소 루트 CLAUDE.md §7.3) |

한 줄 요약: "대기질·날씨·공원·공영자전거 반납소까지 묶어, 오늘의 러닝 가능 여부와
코스를 신호등 카드 1장으로 추천하는 시민 러너 동반 앱."

---

## 1. 디렉터리 구조 (고정)

```
_여분_전국통합데이터_런메이트/
├── CLAUDE.md              ← 본 문서
├── 아이디어.md             ← 컨셉 한 장
├── 제안서.md               ← 심사 제출용 본문 (읽기 전용, 스택 규격)
├── docs/
│   ├── 개발계획서.md        ← 표 위주, §5 현재 상황 갱신 의무
│   ├── 개발보고서.md        ← 실 캡처 + 검토 체크리스트
│   └── screenshots/        ← Next.js 실구동 PNG
└── dev/
    └── run-mate/          ← Next.js 16 App Router · TypeScript · Tailwind v4
```

- 문서용(`docs/`)과 개발용(`dev/`)을 섞지 않는다.
- 캡처는 반드시 `docs/screenshots/` 에 PNG 로 저장하고 Markdown 이미지 링크로 삽입.

---

## 2. 작업 흐름 (매 세션)

```
1. 저장소 루트 CLAUDE.md §7 재확인 (로컬 LLM 전용, API 기반 AI 금지)
2. 공모전 CLAUDE.md 의 문서별 규격(제안서·개발계획서·개발보고서) 재확인
3. 본 문서 + 제안서.md 재확인 (제안서가 기술 스택 규격)
4. 작업 계획 수립 (TODO)
5. 코드/문서 변경
6. 실제 구동(pnpm dev) → 캡처 (`_여분_공유/scripts/capture.mjs` 또는 수동)
7. 캡처 검토 → 의도와 다르면 수정·재캡처
8. docs/개발계획서.md §5 현재 상황 갱신 (last_updated YYYY-MM-DD HH:MM)
9. docs/개발보고서.md 해당 섹션 갱신
10. 요소기능 단위 커밋 (기획·구조·UI·캡처 등 단위)
```

---

## 3. AI 스택 (로컬 전용)

제안서 §5.1 기술 스택의 "AI (로컬)" 행이 본 규격의 출처다.

| 용도 | 권장 구현 | 참조 |
|---|---|---|
| LLM 추론 (한국어 코스 설명) | Ollama `ko` → **`qwen2.5:32b-instruct-q4_K_M`** | `_여분_공유/lib/local_llm.py` / `local-llm.ts` |
| 구조화 출력 (코스 JSON) | `outlines` 또는 `llama.cpp grammar` | 제안서 §2.2 (2) Tool-use |
| 신호등 결정 | 규칙 기반 가중치 + (Phase 1) LightGBM | 제안서 §2.2 (2) `/api/ai/signal` |
| 임베딩 (선택) | Ollama `nomic-embed-text` | LocalLLM.embed() |
| STT / TTS | 런메이트 MVP 에서는 **미사용** | - |

**금지**: `anthropic`, `openai`, `@anthropic-ai/sdk`, `@google/genai`, Cohere SDK,
Clova Voice SDK, Azure/AWS/Vertex AI 등 외부 AI API 클라이언트 일체.

**AI 엔드포인트** (제안서 §2.2):
- `/api/ai/signal` — 러닝 신호등(🟢/🟡/🔴 + 이유 1줄)
- `/api/ai/course` — 자연어 코스 빌더(Tool-use: `nearby_parks`,
  `nearby_trails`, `elevation_profile`, `nearby_bikes`, `air_quality_now`,
  `weather_now`)

---

## 4. 공공데이터 소스 (제안서 §4)

| 데이터 | 원천 | 프록시 엔드포인트 | 캐시 TTL |
|---|---|---|---|
| 통합대기환경지수(CAI) | 한국환경공단 에어코리아 | `/api/aq?lat,lng` | 1h |
| 초단기·단기 예보 | 기상청 API허브 | `/api/weather?lat,lng` | 1h |
| 도시공원 + 하천 자전거길 | 국토교통부·지자체 | `/api/parks?near=lat,lng` | 24h |
| 전국 공영자전거 실시간 | 행정안전부·KLID 통합 API | `/api/bikes?near=lat,lng` | 2min |
| 수치표고모델(DEM) | 국토지리정보원 | 정적 자산 + OSM+SRTM | - |

모든 프록시는 **5분 TTL 캐시 + stale-while-revalidate** 및 **mock fallback** 을
구현한다(제안서 §5.3 실현 가능성). API 키 부재 시 `_여분_공유/mock-fixtures/*.json`
을 반환해 오프라인 시연을 보장한다.

---

## 5. 공용 리소스 참조

모두 `_여분_공유/` 의 파일을 **참조**(복사 금지):

- 공공 API 프록시: `_여분_공유/lib/public-api-proxy.ts`
- 지도 컴포넌트: `_여분_공유/components/Map.tsx` (Leaflet + OSM + OSRM)
- a11y 토큰: `_여분_공유/tailwind-a11y.config.ts`
- 캡처 스크립트: `node _여분_공유/scripts/capture.mjs <baseUrl> <outDir>`
- Mock fixture: `_여분_공유/mock-fixtures/<api>.json`
- 로컬 LLM 래퍼: `_여분_공유/lib/local-llm.ts`

---

## 6. 빌드·구동

```bash
cd dev/run-mate
pnpm install
pnpm build   # 성공 필수
pnpm dev     # 개발 서버 (http://localhost:3000)

# 로컬 LLM (한국어 코스 설명)
ollama pull qwen2.5:32b-instruct-q4_K_M
ollama serve                     # 백그라운드

# 캡처
node ../../../_여분_공유/scripts/capture.mjs http://localhost:3000 ../../docs/screenshots
```

구동 → 캡처 → 검토의 순환이 **필수**. 목업·합성 이미지 금지
(저장소 루트 CLAUDE.md §2.3).

---

## 7. 화면 규격 (제안서 §2.2)

제안서의 5대 화면이 MVP 범위다. 어느 한 화면이라도 누락되면 DoD 미충족.

| # | 화면 | 경로(예시) | 핵심 기능 |
|:--:|---|---|---|
| ① | 홈 — 러닝 신호등 | `/` | 🟢/🟡/🔴 카드 + 이유 1줄 + 아침/저녁/야간 3블록 |
| ② | 코스 지도 | `/map` | 공원·하천·둘레길 POI + 3/5/10km 루트 + 반납소 마커 |
| ③ | AI 코스 빌더 | `/builder` | 자연어 입력 → LLM Tool-use → 코스 카드 |
| ④ | 러닝 기록 | `/log` | Geolocation 트래킹 + 페이스·거리·고도 + PR 갱신 |
| ⑤ | 러닝 크루 | `/crew` | 이벤트 생성/참여 (Phase 2: 조건부 자동 취소) |

---

## 8. 제출 DoD (Definition of Done)

- [ ] `CLAUDE.md` / `아이디어.md` / `제안서.md` / `docs/개발계획서.md` / `docs/개발보고서.md` 5종 존재
- [ ] `dev/run-mate/` `pnpm build` 1회 이상 성공
- [ ] Mock 모드로 공공 API 키 없이 5개 화면 전부 시연 가능
- [ ] 실제 구동 캡처 PNG 5장+ (각 핵심 화면 1장 이상)
- [ ] 개발보고서 체크리스트 7항목 ✅
- [ ] 로컬 LLM(Ollama `qwen2.5:32b-instruct-q4_K_M`) 네트워크 차단 상태에서 응답 확인
- [ ] 커밋에 `Co-Authored-By: Claude` 트레일러 0건

---

## 9. 절대 금지

- ❌ 클라우드 AI API (Claude/OpenAI/Gemini/Clova/Azure/Vertex 등)
- ❌ 캡처 없이 "구현 완료" 보고
- ❌ mock 폴백 부재 (인증키 없을 때 동작 실패)
- ❌ 제안서 내용과 구현 괴리 (제안서가 규격, 다르면 제안서 먼저 수정)
- ❌ `Co-Authored-By: Claude` 커밋 트레일러
- ❌ API 키 하드코딩 — `.env` + `.gitignore`
- ❌ `docs/` 외부에 문서 / `dev/` 외부에 코드 산재

---

*`_여분_전국통합데이터_런메이트/CLAUDE.md` · v1 · 2026-04-22*
