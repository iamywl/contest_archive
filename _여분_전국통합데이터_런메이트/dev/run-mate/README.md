# Run Mate — 런메이트

Next.js 16 App Router · TypeScript · Tailwind v4 · Leaflet + Recharts.

대기질·날씨·공영자전거 반납소 데이터를 묶어 "오늘 러닝 가능?"을 신호등 1장으로 답하는 MVP.

## 개발

```bash
pnpm install
pnpm dev    # http://localhost:3000
pnpm build  # 필수 통과
```

## 구조

- `src/app/page.tsx` — 러닝 신호등 홈 (대기질+날씨 결합)
- `src/app/course/page.tsx` — 코스 지도 + 자전거 반납소
- `src/app/api/{aq,weather,bikes,signal}/route.ts` — 프록시·규칙 엔진

## 공용 자산

- `_여분_공유/lib/public-api-proxy.ts` — 캐시·SWR·mock 폴백
- `_여분_공유/mock-fixtures/*.json` — 인증키 부재 시 폴백
- `_여분_공유/tailwind-a11y.config.ts` — a11y 토큰 참조

## 빌드 검증

| 일자 | 명령 | 결과 | 라우트 |
|---|---|---|---|
| 2026-04-21 | `pnpm build` (Next 16.2.4 + Turbopack) | ✅ 성공 | `/`, `/course`, `/api/{aq,weather,bikes,signal}` |

- 페이지 2종(홈·코스 지도) + API 라우트 4종 모두 프로덕션 번들에 포함.
- Mock 폴백 전용 구성 — 인증키 없이 시연 가능.
