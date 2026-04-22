# CLAUDE.md — 안심귀가 프로젝트 작업 지침

> 이 파일은 `_여분_공유/templates/CLAUDE.md` 를 기반으로 생성되었습니다.
> 저장소 루트 [`../CLAUDE.md`](../CLAUDE.md) 와 공모전 [`../2026_전국 통합데이터 활용 공모전 /CLAUDE.md`](../2026_전국%20통합데이터%20활용%20공모전%20/CLAUDE.md) 를 상속합니다.

---

## 0. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 프로젝트명 | **안심귀가 (Safe Return)** |
| 공모전 | 2026 전국 통합데이터 활용 공모전 |
| 카테고리 | 여성 야간 귀가 안전 · 밝기 점수 경로 |
| 타깃 | 야간 귀가 여성·학생·1인 가구 + 보호자 |
| 폴더 | `_여분_전국통합데이터_안심귀가/` |
| 기준 머신 | MacBook Pro M4 Max · 128GB (저장소 루트 CLAUDE.md §7.3) |

---

## 1. 디렉터리 구조 (고정)

```
_여분_전국통합데이터_안심귀가/
├── CLAUDE.md              ← 본 문서
├── 아이디어.md             ← 컨셉 한 장
├── 제안서.md               ← 심사 제출용 본문 (읽기 전용, 스택 규격)
├── docs/
│   ├── 개발계획서.md        ← 표 위주, §5 현재 상황 갱신 의무
│   ├── 개발보고서.md        ← 실 캡처 + 검토 체크리스트
│   └── screenshots/        ← 실제 구동 캡처 (Next.js PWA)
└── dev/safe-return/       ← Next.js 16 App Router + Leaflet + OSRM
```

---

## 2. 작업 흐름 (매 세션)

```
1. 저장소 루트 CLAUDE.md §7 재확인 (로컬 LLM 전용, API 기반 AI 금지)
2. 본 문서 + 제안서.md 재확인 (제안서가 기술 스택 규격)
3. TodoWrite 로 작업 계획
4. 코드/문서 변경
5. 실제 구동 → 캡처 (capture.mjs 또는 수동, 모바일 뷰포트 우선)
6. 캡처 검토 → 의도와 다르면 수정·재캡처
7. 개발계획서 §5 현재 상황 갱신 (last_updated YYYY-MM-DD HH:MM)
8. 개발보고서 해당 섹션 갱신
9. 요소기능 단위 커밋 (기획·구조·UI·캡처 등 단위)
```

---

## 3. AI 스택 (로컬 전용)

| 용도 | 권장 구현 | 참조 |
|---|---|---|
| 긴급 3단계 분류 LLM | Ollama `small` → **qwen2.5:7b-instruct-q4_K_M** | `_여분_공유/lib/local-llm.ts` |
| 구조화 출력 | `outlines` (JSON 스키마 강제, 3-way 라벨 고정) | - |
| 밝기 점수 계산 | 서버사이드 TS 순수 함수 (AI 미사용) | 제안서 §2.2 (1) |
| 임베딩 | (본 프로젝트 미사용) | - |
| 지도·경로 | Leaflet + OSRM self-host (가중치 후처리) | `_여분_공유/components/Map.tsx` |
| 흔들기 감지 | DeviceMotion API (브라우저 네이티브) | - |

**긴급 분류 LLM 선정 사유 (제안서 §5.1)**: 112 오탐 방지용 **경량·저지연** 분류가 목적이므로 대형 모델이 아닌 `qwen2.5:7b-q4_K_M` (약 4.7GB RAM) 을 사용. 한국어 지원·낮은 메모리·빠른 첫 토큰.

**금지**: `anthropic`, `openai`, `@anthropic-ai/sdk`, `@google/genai`, Clova Voice API, Pinecone 등 외부 AI/벡터 API 일체.

---

## 4. 공용 리소스 참조

모두 `_여분_공유/` 의 파일을 **참조**(복사 금지):

- 공공 API 프록시: `_여분_공유/lib/public-api-proxy.ts` (CCTV·가로등·편의점·지구대·스카우트 6종)
- 지도: `_여분_공유/components/Map.tsx`
- a11y 토큰: `_여분_공유/tailwind-a11y.config.ts` (긴급 UI 고대비)
- 캡처: `node _여분_공유/scripts/capture.mjs <baseUrl> <outDir>`
- Mock fixture: `_여분_공유/mock-fixtures/{cctv,lamps,cvs,stations,scouts}.json`

---

## 5. 빌드·구동

### Next.js (dev/safe-return)
```bash
cd dev/safe-return
pnpm install
pnpm build   # 성공 필수
pnpm dev     # 개발 서버 (기본 3000)
```

### 로컬 LLM 사전 기동 (긴급 분류)
```bash
ollama pull qwen2.5:7b-instruct-q4_K_M
ollama serve &
```

### OSRM self-host (경로 가중치)
```bash
# 서울 일부 구간 OSM 추출본을 로컬 OSRM 컨테이너로 기동
docker run -p 5000:5000 osrm/osrm-backend osrm-routed /data/seoul.osrm
```

### SMS (NHN Toast — 보호자 공유)
- 키 부재 시 **mock 발송 로그만 남기는 fallback** 으로 동작해야 함.
- 실제 발송은 `NHN_TOAST_APP_KEY` 환경변수 존재 시에만.

구동 → 캡처 → 검토의 순환이 **필수**.

---

## 6. 제출 DoD (Definition of Done)

- [ ] `CLAUDE.md` / `아이디어.md` / `제안서.md` / `docs/개발계획서.md` / `docs/개발보고서.md` 5종 존재
- [ ] `pnpm build` 성공 1회 이상
- [ ] Mock 모드로 API 키 없이 5개 화면(홈/경로지도/보호자공유/긴급모드/리포트) 시연 가능
- [ ] 실제 구동 캡처 PNG 5장+ (화면별 1장 이상)
- [ ] 긴급 분류 LLM 응답 JSON 스키마 검증 통과
- [ ] `tel:112` 딥링크 폴백 동작 확인 (자치경찰 API 미승인 전제)
- [ ] 개발보고서 체크리스트 7항목 ✅
- [ ] 커밋에 Co-Authored-By: Claude 트레일러 0건

---

## 7. 절대 금지

- ❌ 클라우드 AI API (Claude/OpenAI/Gemini/Clova 등)
- ❌ 클라우드 벡터 DB (Pinecone 등)
- ❌ 112 직접 REST 호출 위장 (자치경찰 API 승인 전에는 `tel:` 딥링크만)
- ❌ 흔들기 단독 트리거로 즉시 112 송출 (반드시 3초 카운트다운 + 해제 버튼)
- ❌ 보호자 토큰 서버 영구 저장 (JWT 만료형, PII 최소화)
- ❌ 캡처 없이 "구현 완료" 보고
- ❌ mock 폴백 부재 (인증키 없을 때 동작 실패)
- ❌ 제안서 내용과 구현 괴리 (제안서가 규격, 다르면 제안서 먼저 수정)
- ❌ Co-Authored-By: Claude 커밋 트레일러

---

*`_여분_전국통합데이터_안심귀가/CLAUDE.md` · v1 · 2026-04-22*
