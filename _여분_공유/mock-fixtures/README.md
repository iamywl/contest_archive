# 공공 API Mock Fixtures

공공데이터포털 API 인증키가 없거나 심사 환경 네트워크 차단 시 **폴백 데이터**로 사용.

`public-api-proxy.ts` 의 `fetchPublic(url, { mockFixture: "..." })` 옵션이
이 디렉터리의 JSON 파일을 로드한다.

---

## 구조 원칙

- 파일명: `{api}.json` (소문자·하이픈)
- 스키마: 실제 API 응답을 최대한 반영. 필드 누락·명명 차이 금지.
- 좌표: 서울 중심부 (37.55~37.58, 126.97~127.03) 표본 사용.
- 데이터 정직성: **"Mock"** 임을 응답에 명시하는 플래그 `"_mock": true` 포함 권장.

---

## 수록 fixture (초기)

| 파일 | 사용 프로젝트 | 원 데이터 |
|---|---|---|
| `shelters.json` | 실버친구 · 안심귀가(한파) | 행정안전부 무더위쉼터 |
| `senior-halls.json` | 실버친구 | 경로당 현황 |
| `parking.json` | 나들이맵 · 안심귀가 | 공영주차장 실시간 잔여면수 |
| `bus-arrival.json` | 실버친구 · 휠체어맵 | 저상버스 실시간 (TAGO) |
| `air-quality.json` | 런메이트 · 나들이맵 | 에어코리아 CAI |
| `weather.json` | 런메이트 · 실버친구 · 나들이맵 | 기상청 초단기 |
| `bikes.json` | 런메이트 | 전국 공영자전거 실시간 |
| `youth-policies.json` | 청년원스톱 | 온통청년 정책 메타 |

필요 fixture는 각 프로젝트 개발 중 추가. 스키마 변경 시 본 디렉터리 PR 우선.

---

*`_여분_공유/mock-fixtures/README.md` · 2026-04-22*
