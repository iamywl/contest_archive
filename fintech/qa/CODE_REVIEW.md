---
title: RiskScope MVP 코드 리뷰 — 로직·수학·엣지 케이스 정밀 점검
project: FIN:NECT 챌린지 2026
date: 2026-04-21
scope: lib/ 전체 + app 라우트 로직
method: 소스 독해 + 샘플 프로필 계산 검증 + 빌드·재캡처
status: 2차 완료 (신규 결함 7건 발견, 7건 수정)
---

# RiskScope MVP 코드 리뷰 (2차)

1차 [REPORT.md](REPORT.md)는 **UI 렌더링**을 스크린샷으로 검증했다.
본 2차 리뷰는 **로직/수학/상태 관리의 정확성**을 소스 독해 기준으로 점검한다.

---

## 1. 정밀 점검 결과 요약

| 분류 | 점검 건수 | 결함 발견 | 수정 완료 | 잔여 |
|---|---|---|---|---|
| 수치 알고리즘 (GBM·상관·몬테카를로·분위수) | 6 | 0 | — | 0 |
| 포트폴리오/DCA 시뮬레이션 | 1 | **2 (High·Low)** | 2 | 0 |
| 추천 엔진 가중치 | 6 차원 | **1 (Low)** | 1 | 0 |
| 비용·세금 분해 | 5 항목 | 0 (placeholder 명시) | — | 0 |
| 상태 관리 (localStorage) | 3 스토어 | **1 (Medium)** | 1 | 0 |
| 엣지 케이스 / 방어 코드 | 8 지점 | **1 (Low, mutation)** | 1 | 0 |
| 데드 코드 / 미사용 export | — | **3** | 3 | 0 |
| 도메인 타입 설계 | — | **1 (Low)** | 1 | 0 |
| **합계** | — | **9** | **9** | **0** |

---

## 2. 알고리즘 수학 검증

### 2.1 GBM 종가 공식 — `lib/simulation/engine.ts:43`
```
S(T) = S0 · exp((μ − ½σ²) T + σ √T · Z)
```
교과서 형태 그대로. ✅ 정확.

### 2.2 Cholesky 2×2 상관 샘플링 — `lib/simulation/correlation.ts:14`
```
y1 = z1
y2 = ρ z1 + √(1−ρ²) z2
```
**ρ** 범위 `[−0.999, 0.999]` 클램프. ✅ 수치 안정.

### 2.3 분위수 인덱싱 — `engine.ts:57`
```
pick(q) = sorted[min(n−1, floor(q·n))]
```
n=5000, q=0.05 → index 250. 정확한 분위수는 0.05·(n−1)=249.95로 근사치 오차 ±1 index, 꼬리 통계에서는 무의미. ✅ 허용 범위.

### 2.4 히스토그램 구간 나누기 — `engine.ts:77`
`Math.min(binCount-1, floor((v-min)/width))` 로 상단 경계값이 마지막 bin에 누락 없이 포함됨. ✅

### 2.5 XAI 요인별 분해 — `lib/simulation/xai.ts`
현재는 **one-at-a-time (OAT)** 근사 (기본 대비 쇼크 하나씩 적용 → ΔP5 측정 → 절대값 비율).
SHAP 정확형(Shapley 샘플링)은 다음 이터레이션 과제로 `Admin` 감사 체크리스트에 명시. ✅ 의도된 단순화.

### 2.6 인플레이션 실질 수익률 변환 — `lib/simulation/real-return.ts`
`real_return = (final / (1+i)^T − initial_nominal) / initial_nominal`
t=0 시점 nominal == real이므로 분모를 nominal로 잡는 건 정답. ✅

---

## 3. 발견된 결함과 조치 (신규 9건)

### B4 · **High** · 포트폴리오 DCA가 USD 자산의 FX 리스크를 무시
- **파일**: `lib/simulation/portfolio.ts:107-115` (수정 전)
- **증상**: 월 적립금이 자산 GBM만 적용되고 환전 요인 누락 → USD-heavy 포트폴리오의 DCA 분포가 환 변동성만큼 **과소 추정**
- **원인**: 기존 로직이 `weightedMu`/`weightedSigma`만으로 DCA 팩터를 계산, 환율은 초기 일시금에만 적용됨
- **추가 결함**: 월별 FX 경로를 그려놓고도 자산 z는 **별개의 정규 표본**으로 correlatedNormals를 호출 → 상관 관계가 무의미
- **조치**: 포트폴리오 엔진 전면 재작성
  - 월별 FX 로그 경로 누적 `fxLogCum[0..months]` 기록
  - 일시금: 종가 FX z를 이론값으로 역산해 자산 z와 정확히 상관
  - DCA: 각 기여월 `m`에 대해 잔존 구간 `(T-m·dt)`의 GBM 계수 + 잔존 FX 계수를 **홀딩별**로 적용
- **증빙 (변화값)**: SPY+KODEX200 50:50, 10년, 초기 ₩10M + 월 ₩500k
  | 지표 | 수정 전 | 수정 후 |
  |---|---|---|
  | P5 | +30.7% | **+29.5%** (약간 악화) |
  | P95 | +95.8% | **+109.4%** (상방 꼬리 확장) |
  | 최악 | 미표시 | **−0.1%** (현실적 하한) |
  
  분포가 **좌우로 모두 넓어짐** = 환 변동성이 반영된 현실적 분포로 개선됨.

### B5 · Low · KRW 자산 FX 누적 루프의 무의미한 연산
- **파일**: 동 파일, 수정 전 63-67줄 `fxLevelKRW *= 1`
- **조치**: 재작성 과정에서 KRW 분기 자체를 제거 (FX 팩터 = 1로 단순 상수 처리)

### B6 · **Medium** · 감사 로그가 슬라이더 드래그마다 localStorage에 append
- **파일**: `app/simulate/page.tsx:46`
- **증상**: 사용자가 초기금 슬라이더를 드래그하면 `useEffect` 의존성이 매 틱마다 변경되어 감사 엔트리가 수십~수백 건 쌓임. localStorage 한도(5-10MB) 침식 가능.
- **조치**: `lib/audit/log.ts:appendAudit`에 **연속 동일 signature 디듀프 + MAX 500 cap** 추가
  ```ts
  function sameSignature(a, b) = same(kind, product.id, horizon, initialKRW)
  if (last && sameSignature(last, entry)) { overwrite last; return; }
  next = [...existing, entry].slice(-500);
  ```

### B7 · Low · 환 선호 점수의 하드코딩된 상품 ID 예외
- **파일**: `lib/recommend/engine.ts:scoreFxPreference` (수정 전)
- **증상**: `p.id !== "KBSTAR_UST10"` 로 헤지형 상품을 직접 명시 — 상품 추가 시마다 엔진 수정 필요
- **조치**: `Product.fxHedged?: boolean` 플래그를 도메인 타입에 추가 → 추천/엔진/포트폴리오 3개 경로 모두에서 `fxExposed = currency==="USD" && !fxHedged` 파생
  - `lib/domain/types.ts`: Product에 `fxHedged?` 필드 추가
  - `lib/data/products.ts`: KBSTAR_UST10에 `fxHedged: true` 지정
  - `lib/simulation/types.ts`: AssetParams에도 전파
  - `lib/simulation/multi-scenario.ts`: `productToAsset`이 `fxHedged` 복사
  - `lib/simulation/engine.ts`: `fxExposed` 조건으로 통일
  - `lib/simulation/portfolio.ts`: 일시금·DCA 모두 `fxExposed` 조건 사용
  - `lib/recommend/engine.ts`: scoreFxPreference·buildWarnings 모두 플래그 기반으로 분기

### B10 · Low · 은퇴목표 페이지에서 `finalKRW.sort()` 원본 mutate
- **파일**: `app/goal/page.tsx` (수정 전)
- **증상**: JSX 내부에서 `result.finalKRW.sort(...)`를 두 번 호출, 동일 경로 memo된 배열을 매 렌더마다 mutate
- **조치**: `sortedFinal = useMemo(() => [...result.finalKRW].sort(...), [result])`로 추출

### DeadCode-1 · `ASSETS` 배열 미사용
- **파일**: `lib/data/market.ts:9` (삭제 전)
- **원인**: Sprint 0 초기 설계에서만 사용. Sprint 1에 `PRODUCTS`로 대체 후 잔존
- **조치**: 배열 및 import 제거. `FX_USDKRW`, `SCENARIOS`만 export 유지

### DeadCode-2 · `Corr2x2` 타입 미사용
- **파일**: `lib/simulation/correlation.ts:4`
- **조치**: 타입 정의 삭제. `correlatedNormals`는 `ρ` 를 인자로 직접 받음

### DeadCode-3 · `runDCA` 헬퍼 미사용
- **파일**: `lib/simulation/portfolio.ts:160` (삭제 전)
- **원인**: 편의 래퍼였으나 UI는 `runPortfolioSimulation`을 직접 호출
- **조치**: 삭제

### TypeDesign-1 · 환헤지 상품 구분이 타입 레벨에 없음
- **파일**: `lib/domain/types.ts`
- **조치**: `fxHedged?: boolean` 필드 추가 (상기 B7 참조)

---

## 4. 추천 엔진 가중치 수동 검증

기본 프로필 (35세·10년·중위험·자산증식·환노출 무관·중급):

| 차원 | 계산식 | 기대 점수 |
|---|---|---|
| 리스크 적합도 | `max(0, 30 - |p.risk - 3|·10)` | KODEX(3)→30, SPY(4)→20, ELS(5)→10, 예금(1)→10 |
| 기간 적합도 | 10년 + `etf_domestic` → 22 | |
| 목표 적합도 | `wealth_growth` + ETF → 18 | |
| 환 선호 | either → 10 | |
| 최소 투자금 | 50k ≤ 10M → 10 | |
| 지식 수준 | non-complex → 8 | |
| **KODEX200 합계** | 30+22+18+10+10+8 | **98** ✅ (스크린샷 일치) |

추가 검증: **TDF 2045** (pension, risk 3)
- 리스크: 30 · 기간: pension + 10yr → 25 · 목표: wealth_growth + etf → 10 (pension이 `etf`가 아니므로 10 기본값) · 환: 10 · 최소: 10 · 지식: 8 → 기대 **93**. 스크린샷 93 ✅

추가 검증: **HSCEI_ELS** (risk 5, complex)
- 리스크: `max(0, 30-20) = 10` · 기간: `fund` etf 로직에 해당 (`fund` 카테고리) → 22 · 목표: `fund`는 `etf_foreign/domestic`에 포함 안됨 → 10 · 환: USD 미heged → 15 (env: hedge preference unset = "either" → 10... wait)

재계산 HSCEI_ELS with either fxPreference:
- 리스크: max(0, 30-|5-3|·10) = 10
- 기간 10yr, category=fund → 22
- goal=wealth_growth, category=fund 는 etf 분기 아님 → 10 (default)
- fxPref=either → 10
- minimum 10M ≤ cap = max(100M·0.1, 500k·3)=10M → 10
- knowledge=intermediate, 복합 상품이지만 advanced 아님 → 0
- 합계 62. 스크린샷 62 ✅

3개 상품 모두 수동 계산과 **완전 일치**.

---

## 5. 비용·세금 공식 독해

### 5.1 TER 누적 — `lib/cost/breakdown.ts:49`
```
terTotal = grossFinalKRW · (1 − (1 − TER)^T)
```
TER 드래그의 종가 기준 표현. 연속복리 관점에서 `S_net(T) = S_gross(T) · (1-TER)^T`, 손실은 `S_gross·(1 − (1-TER)^T)`. ✅ 정확.

### 5.2 환전 스프레드 — `breakdown.ts:50`
```
fxSpread = initialKRW · fxSpreadOnetime · 2
```
**근사 한계**: 매수 스프레드는 initial 기준이 맞지만 매도 스프레드는 final 기준이어야 더 정확. 1% 스프레드 × 10년 상승 기준이면 ~10~20% 과소 반영 가능. Placeholder 수준으로 수용, Sprint-next에서 개선 TODO.

### 5.3 과세 계산 — `breakdown.ts:52-53`
```
taxableGain = max(0, gain − TER − FX − 수수료)
tax = taxableGain · rate(treatment)
```
**한계**: 한국 세제에 있는 250만원 공제·ISA 200만원 비과세·연금 1,500만원 저율 상한 미반영. 코드 상단 주석에 명시됨. Sprint-next 고도화 대상.

### 5.4 net / 실효 수익률
```
net = gross − TER − FX − tx − tax
effective = (net / initial − 1) · 100
```
일관성 있고 수식상 오류 없음. ✅

---

## 6. 상태 관리 점검

| 스토어 | 키 | 행동 | 검증 |
|---|---|---|---|
| profile | `riskscope.profile.v1` | mount 시 load, save 시 updatedAt 덮어쓰기 | ✅ SSR 가드 `typeof window` 있음 |
| portfolio | `riskscope.portfolio.v1` | 홀딩 배열 저장, `resolveHoldings`로 PRODUCTS와 조인 | ✅ 상품 삭제 대비 `filter(null)` |
| audit | `riskscope.audit.v1` | 시뮬레이션 자동 append, **수정 전 무제한 증가** | 수정 후 ✅ 디듀프+500개 cap |

---

## 7. 엣지 케이스 점검

| 상황 | 대응 | 결과 |
|---|---|---|
| 잘못된 productId 쿼리 파라미터 | `findProduct(id) ?? PRODUCTS[0]` 폴백 | ✅ |
| 포트폴리오 가중치 합 = 0 | `|| 1`로 나눗셈 방어 | ✅ (수정 시 추가) |
| 빈 홀딩 리스트 | `throw new Error(...)` + UI에서 `result = null` 체크로 조기 반환 | ✅ |
| 백테스트 시작 연도 + 기간이 2024 초과 | 슬라이더 max를 `Math.min(20, 2024 - startYear + 1)`로 제한 | ✅ |
| 과거 데이터 없는 상품 | `historical.length < 2` 가드 → CAGR/MDD 0 반환 | ✅ |
| 프로필 없이 추천 페이지 접근 | 안내 배너 + 프로필 링크 | ✅ |
| 매우 큰 시나리오 쇼크 (+30%, vol x3) | 수학적으로는 유효, exp 오버플로 가능성은 20년×40% 정도까지는 없음 | ✅ |
| 섹터 데이터 없는 상품 (ELS·예금·채권·ISA·연금) | 폴백 UI + 상품별 경고 (1차에서 수정) | ✅ |

---

## 8. 수정 후 빌드·회귀 검증

| 검증 | 결과 |
|---|---|
| `npx tsc --noEmit` | 에러 0건 |
| `next build` | 17/17 라우트 빌드 성공, 정적 15 + 동적 2 |
| Playwright 22 스크린샷 재캡처 | 22/22 성공, 런타임 에러 0건 |
| DCA 수정 영향 확인 | P95 +95.8 → **+109.4%**, 최악 미표시 → **−0.1%** 로 현실적 분포 | ✅
| 추천 스코어 재검증 | KODEX 98 / TDF 93 / HSCEI_ELS 62 — 기존과 일치 (default 프로필 영향 없음) | ✅

---

## 9. 검토자 의견

### 9.1 1차 리뷰 대비 개선점
1차 리뷰 (UI 기준) 이후 **소스 레벨 정밀 점검**을 통해 스크린샷으로는 드러나지 않는 **수학적 결함 2건**과 **상태 관리 결함 1건**을 추가 발견·수정했다.
- B4 (DCA FX 누락) 가장 심각: 서비스의 핵심 USP(환 리스크 시뮬레이션)와 정면 충돌하는 결함이었음
- B6 (감사 로그 폭증) 실서비스 시 데이터 관리 문제로 이어질 수 있음
- 데드 코드 3건 제거로 번들 경량화·유지보수성 개선

### 9.2 제안서 차별화 축과의 정합성 재확인
| 차별축 | 코드 레벨 구현 상태 |
|---|---|
| ① 추천 ↔ 시나리오 결합 | `recommend.ts` + `simulate/page.tsx` 딥링크. Full flow 동작 확인 |
| ② 원화 실질 수익률 | `real-return.ts` + 명목/실질 토글. 환 리스크 포함 — **B4 수정으로 진정성 확보** |
| ③ 이해관계자별 XAI | `xai.ts` (고객용) + `admin/page.tsx` (내부) + 자연어 Q&A. 메타데이터 투명 |
| ④ 불완전판매 사전방지 | 3단계 인지체크 + 감사 로그 (**B6 수정으로 안정성 확보**) + ELS 경고 |

### 9.3 잔여 고도화 과제 (Sprint-next)
결함 아닌 "다음 이터레이션 개선":
1. Shapley 샘플링 기반 정식 XAI (현재는 OAT 근사)
2. 세제 공제·비과세 상한 모델링 (한국 세제 placeholder 고도화)
3. 매도 시점 FX 스프레드를 final value 기준으로 보정
4. FRED/BOK ECOS 실데이터 파이프라인 연결
5. 다크모드 per-component dark: 변이체 완결
6. 다자산 공분산 (현재 자산 간 상관은 0 가정)

### 9.4 결론
> **코드는 제대로 개발되었음.**
> 1차 리뷰 당시 발견되지 않았던 **수학/상태 레벨 결함 9건을 발견·전부 수정**했으며, 수정 후 타입체크·빌드·자동 스크린샷 회귀에서 이상 없음을 확인했다. 제안서의 기술적 주장(환 리스크 반영, 감사 로그, XAI 이중 레이어)은 이제 **코드 레벨에서도 일관되게 지지**된다.
>
> 통합본선 데모까지 Sprint-next에서 실데이터 파이프라인과 Shapley XAI 고도화를 진행하면 충분히 경쟁력 있는 MVP.

---

## 부록 A — 변경 파일 목록 (2차 리뷰 수정분)

- `lib/simulation/portfolio.ts` (재작성 — B4, B5, DeadCode-3)
- `lib/simulation/engine.ts` (fxHedged 반영 — B7)
- `lib/simulation/types.ts` (AssetParams.fxHedged 추가)
- `lib/simulation/multi-scenario.ts` (productToAsset fxHedged 복사)
- `lib/simulation/correlation.ts` (Corr2x2 제거 — DeadCode-2)
- `lib/domain/types.ts` (Product.fxHedged 추가 — B7, TypeDesign-1)
- `lib/data/products.ts` (KBSTAR_UST10.fxHedged = true)
- `lib/data/market.ts` (ASSETS 제거 — DeadCode-1)
- `lib/recommend/engine.ts` (scoreFxPreference + buildWarnings fxHedged 분기 — B7)
- `lib/audit/log.ts` (appendAudit 디듀프 + 500 cap — B6)
- `app/goal/page.tsx` (sortedFinal useMemo — B10)

## 부록 B — 재검증 증빙 스크린샷
- [shots/18_recommendations_after_profile.png](shots/18_recommendations_after_profile.png) — 추천 점수 회귀 없음
- [shots/20_portfolio_built.png](shots/20_portfolio_built.png) — DCA FX 반영 후 분포 변화
- [shots/04_simulate_default.png](shots/04_simulate_default.png) — SPY 기본 시뮬레이션 정상
