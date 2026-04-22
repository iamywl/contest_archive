# CLAUDE.md — 나들이맵 프로젝트 작업 지침

> 이 파일은 `_여분_공유/templates/CLAUDE.md` 를 바탕으로 치환된 작업 지침입니다.
> 저장소 루트 [`../CLAUDE.md`](../CLAUDE.md) 와 공모전 [`../2026_전국 통합데이터 활용 공모전 /CLAUDE.md`](../2026_전국%20통합데이터%20활용%20공모전%20/CLAUDE.md) 을 상속합니다.

---

## 0. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 프로젝트명 | **나들이맵 (Outing Map)** |
| 공모전 | 2026 전국 통합데이터 활용 공모전 (행정안전부·한국지역정보개발원) |
| 카테고리 | 영유아 동반 가족 외출 지원 |
| 타깃 | 0~7세 자녀를 둔 30~40대 부모 + 조부모 |
| 폴더 | `_여분_전국통합데이터_나들이맵/` |
| 슬러그 | `outing-map` |
| 기준 머신 | MacBook Pro M4 Max · 128GB (저장소 루트 CLAUDE.md §7.3) |

---

## 1. 디렉터리 구조 (고정)

```
_여분_전국통합데이터_나들이맵/
├── CLAUDE.md              ← 본 문서
├── 아이디어.md             ← 컨셉 한 장
├── 제안서.md               ← 심사 제출용 본문 (읽기 전용, 스택 규격)
├── docs/
│   ├── 개발계획서.md        ← 표 위주, §5 현재 상황 갱신 의무
│   ├── 개발보고서.md        ← 실 캡처 + 검토 체크리스트
│   └── screenshots/        ← Next.js Playwright 캡처
└── dev/
    └── outing-map/         ← Next.js 16 App Router + TypeScript
```

---

## 2. 작업 흐름 (매 세션)

```
1. 저장소 루트 CLAUDE.md §7 재확인 (로컬 LLM 전용, API 기반 AI 금지)
2. 본 문서 + 제안서.md 재확인 (제안서가 기술 스택 규격)
3. TodoWrite 로 작업 계획
4. 코드/문서 변경
5. 실제 구동 → 캡처 (capture.mjs 또는 수동)
6. 캡처 검토 → 의도와 다르면 수정·재캡처
7. 개발계획서 §5 현재 상황 갱신 (last_updated YYYY-MM-DD HH:MM)
8. 개발보고서 해당 섹션 갱신
9. 요소기능 단위 커밋 (기획·구조·UI·캡처 등 단위)
```

---

## 3. AI 스택 (로컬 전용)

제안서 §5.1 기준 스택을 그대로 따른다. 클라우드 AI 언급은 일절 금지.

| 용도 | 권장 구현 | 참조 |
|---|---|---|
| LLM 추론 | Ollama (`chat` → `llama3.3:70b-instruct-q4_K_M`) | `_여분_공유/lib/local-llm.ts` |
| 구조화 출력 | `outlines` (5단계 동선 JSON 강제) | 제안서 §5.1 |
| 혼잡 예측 (초기) | 요일·시간·날씨 휴리스틱 + 이동평균 | 제안서 §2.2 (2) |
| 혼잡 예측 (Phase 2) | LightGBM / Prophet (체크인 로그 기반) | 제안서 §5.4 |
| 지도 | Leaflet + OpenStreetMap | `_여분_공유/components/Map.tsx` |
| 임베딩 (선택) | Ollama `nomic-embed-text` | - |
| 벡터 DB (선택) | FAISS (로컬) | - |

**금지**: `anthropic`, `openai`, `@anthropic-ai/sdk`, `@google/genai`, Cohere SDK, Clova Voice 등 외부 AI API 클라이언트 일체.

---

## 4. 공용 리소스 참조

모두 `_여분_공유/` 의 파일을 **참조**(복사 금지):

- 공공 API 프록시: `_여분_공유/lib/public-api-proxy.ts`
  - 대상 API: 공영주차장 실시간, 공중화장실, 수유실, 어린이도서관, 공원, 기상청 API허브, 에어코리아
  - 5분 TTL + stale-while-revalidate
- 지도: `_여분_공유/components/Map.tsx`
- a11y 토큰: `_여분_공유/tailwind-a11y.config.ts`
- 캡처: `node _여분_공유/scripts/capture.mjs http://localhost:3000 docs/screenshots`
- Mock fixture: `_여분_공유/mock-fixtures/parking.json` 등 (키 없을 때 폴백)

---

## 5. 빌드·구동

### Next.js
```bash
cd dev/outing-map
pnpm install
pnpm build   # 성공 필수
pnpm dev     # 개발 서버 (http://localhost:3000)
```

### 로컬 LLM 기동
```bash
ollama serve &                          # 백그라운드
ollama pull llama3.3:70b-instruct-q4_K_M
```

구동 → 캡처 → 검토의 순환이 **필수**.

---

## 6. 5대 핵심 화면 (제안서 §2.2)

| # | 화면 경로 | 핵심 기능 |
|:--:|---|---|
| ① | `/` (홈 · 오늘 나들이) | 목적지 입력 → AI 5단계 동선 카드 |
| ② | `/map` (지도) | 반경 2km POI 통합 마커 |
| ③ | `/filter` (유아 필터) | 기저귀교환대·수유실·휠체어 등 토글 |
| ④ | `/forecast` (혼잡 예측) | 현재 + 1·2시간 후 막대 그래프 |
| ⑤ | `/diary` (나들이 일기) | 체크인 기록 + 코스 카드 |

---

## 7. 제출 DoD (Definition of Done)

- [ ] `CLAUDE.md` / `아이디어.md` / `제안서.md` / `docs/개발계획서.md` / `docs/개발보고서.md` 5종 존재
- [ ] `pnpm build` 1회 이상 성공
- [ ] Mock 모드로 API 키 없이 시연 가능 (공공 API 5종 + LLM 폴백)
- [ ] 실제 구동 캡처 PNG 5장+ (5대 화면 각 1장 이상)
- [ ] 개발보고서 체크리스트 7항목 ✅
- [ ] 커밋에 `Co-Authored-By: Claude` 트레일러 0건

---

## 8. 절대 금지

- ❌ 클라우드 AI API (Claude/OpenAI/Gemini/Clova 등)
- ❌ 캡처 없이 "구현 완료" 보고
- ❌ mock 폴백 부재 (인증키 없을 때 동작 실패)
- ❌ 제안서 내용과 구현 괴리 (제안서가 규격, 다르면 제안서 먼저 수정)
- ❌ `Co-Authored-By: Claude` 커밋 트레일러
- ❌ 위치 정보(PII) 서버 저장 (제안서 §5.3 — 클라이언트에서만 사용)

---

*`_여분_전국통합데이터_나들이맵/CLAUDE.md` · v1 · 2026-04-22*
