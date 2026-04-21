# 01. 공공데이터포털 API 연동

**목표**: 공공데이터포털에서 인증키를 발급받아 책크인 앱이 **실시간 실 데이터**로 동작하도록 전환한다.
**예상 소요**: 2~3시간 (승인 즉시 발급 기준, 지연 시 최대 24시간)

---

## 0. 사전 체크리스트

- [ ] 본인 명의 이메일 (네이버/구글 등)
- [ ] 공공데이터포털 회원가입 가능 (만 14세 이상)
- [ ] 로컬 개발 환경에서 `pnpm dev` 이 돌아감을 확인 [docs/검증보고서.md](../docs/검증보고서.md)

---

## 1. 공공데이터포털 회원가입 & 키 발급

### 1.1 회원가입 (5분)

1. 공공데이터포털 접속: https://www.data.go.kr/
2. 우측 상단 **[회원가입]** 클릭.
3. 개인 회원으로 가입. 본인인증(휴대폰 or 아이핀) 후 이메일 인증 완료.

### 1.2 활용 API 신청 — 3종 필수

책크인이 필요한 **전국 통합데이터 3종**을 모두 신청해야 한다.

| # | 데이터명 | 공공데이터포털 검색어 | API URL 예시 |
|:--:|---|---|---|
| 1 | 공공도서관 열람실 현황 실시간 정보 | `전국 통합데이터 공공도서관 열람실` | https://www.data.go.kr/data/15142580/openapi.do |
| 2 | 전국 공영자전거 실시간 정보 | `전국 통합데이터 공영자전거` | https://www.data.go.kr/data/15142581/openapi.do (예시) |
| 3 | 공영 물품보관함 현황 실시간 정보 | `전국 통합데이터 물품보관함` | 공공데이터포털에서 검색 |

> **Tip**: 공공데이터포털 상단 검색창에 위 검색어를 그대로 입력하면 최상단에 뜹니다.
> 또는 [이 링크](https://www.data.go.kr/tcs/dss/selectDataSetList.do?searchKeyword=전국%20통합데이터)를 먼저 확인.

각 데이터 페이지에서:
1. **[오픈 API]** 탭 클릭
2. **[활용신청]** 버튼 클릭
3. 활용 목적에 간단히 기재 (예: *"2026 전국 통합데이터 활용 공모전 출품 — MZ세대 학습 루틴 앱 개발"*)
4. 라이선스 표시 확인 → **[동의합니다]** 체크 → 신청.
5. 신청 직후 **개발계정 자동 승인**되어 즉시 사용 가능 (일부 데이터는 심사 24h).

### 1.3 인증키 확인

1. 공공데이터포털 **[마이페이지]** → **[데이터활용 > Open API > 인증키 발급현황]**
2. **일반 인증키 (Encoding)** 값을 복사. (보통 `%2F` 같은 URL 인코딩 포함)
3. Decoding 버전도 함께 보여주는데, 본 프로젝트는 **Encoding 버전**을 그대로 사용.

> ⚠️ 이 키는 **비밀값**입니다. 커밋·블로그·스크린샷에 노출 금지.

---

## 2. 로컬 환경 변수 설정

### 2.1 `.env.local` 생성

```bash
cd dev/chekcin
cp .env.example .env.local 2>/dev/null || touch .env.local
```

**`.env.local`** 에 다음 내용 추가:

```
# 공공데이터포털 인증키 (Encoding 버전)
DATA_GO_KR_KEY=여기에_본인의_Encoding_키_붙여넣기

# AI 기능 실사용 시 (선택, 04번 가이드 참조)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

### 2.2 키가 잘 읽히는지 테스트

```bash
# dev 서버 재시작 필요 (env 변경시)
pnpm dev
```

브라우저에서 http://localhost:3001/api/libraries 접속 → JSON 응답.
(아직 코드는 mock 사용 중이라 이 단계에서 응답 스키마가 바뀌지 않습니다. 다음 단계에서 실 API 교체.)

---

## 3. 실 API 호출 코드 작성 — `sources.ts` 교체

### 3.1 공공 API 스펙 파악

각 API 의 **상세기능 명세** 페이지에서 다음을 기록:

- 엔드포인트 URL
- 필수/선택 파라미터 (예: `pageNo`, `numOfRows`, `serviceKey`, `type=json`)
- 응답 구조 (샘플 JSON/XML)

예시 (공공도서관 열람실 실시간 정보 — 참고):
```
GET http://apis.data.go.kr/B552881/kpublicroom/getPublicRoomList
  ?serviceKey={DATA_GO_KR_KEY}
  &pageNo=1
  &numOfRows=1000
  &type=json
```

> 정확한 경로는 공공데이터포털 해당 API 페이지의 **"상세기능정보"** 탭에서 확인.

### 3.2 코드 교체 — `dev/chekcin/src/lib/data/sources.ts`

현재 이 파일은 TODO 주석 상태로 mock 에만 의존합니다.
다음 패턴으로 교체하세요.

```typescript
import type { BikeStation, Library, Locker, LatLng } from "@/lib/types";
import { cached } from "@/lib/data/cache";
import { mockBikes, mockLibraries, mockLockers } from "@/lib/data/mock";

const API_KEY = process.env.DATA_GO_KR_KEY ?? "";
const USE_MOCK = !API_KEY || API_KEY === "mock";

// ── 공공도서관 열람실
const LIBRARIES_URL =
  "http://apis.data.go.kr/B552881/kpublicroom/getPublicRoomList"; // 실제 URL로 교체

export async function fetchLibraries(): Promise<Library[]> {
  return cached("libs", 300, async () => {
    if (USE_MOCK) return mockLibraries();

    const url = new URL(LIBRARIES_URL);
    url.searchParams.set("serviceKey", API_KEY);
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("numOfRows", "1000");
    url.searchParams.set("type", "json");

    const res = await fetch(url.toString(), {
      // 공공 API 는 대부분 Cache-Control 이 제한적이라 우리 쪽에서 cached() 로 감쌈
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`libraries api ${res.status}`);
    const json = await res.json();

    // API 응답 구조에 맞춰 정규화 — 실제 필드명으로 교체 필요
    const items = json?.response?.body?.items?.item ?? [];
    return items.map(normalizeLibrary);
  });
}

function normalizeLibrary(raw: any): Library {
  return {
    id: String(raw.libCode ?? raw.libId),
    name: String(raw.libName ?? raw.LBRRY_NM),
    address: String(raw.addr ?? raw.ADDR ?? ""),
    location: {
      lat: Number(raw.latitude ?? raw.LAT),
      lng: Number(raw.longitude ?? raw.LNG),
    },
    seats: {
      total: Number(raw.totalSeat ?? raw.TOT_SEAT_CNT ?? 0),
      occupied: Number(raw.usedSeat ?? raw.USE_SEAT_CNT ?? 0),
      available: Number(raw.restSeat ?? raw.REMAIN_SEAT_CNT ?? 0),
      updatedAt: String(raw.updateDt ?? raw.UPDT_DT ?? new Date().toISOString()),
    },
    rooms: [], // 별도 API 존재 시 채움
  };
}
```

**주의사항**:
- 필드명은 기관·데이터마다 다르니 실제 응답 샘플을 찍어보고 그에 맞게 `normalizeLibrary` 수정.
- `?type=json` 을 지원하지 않고 XML만 반환하는 API 가 있다. 그 경우 `fast-xml-parser` 를 추가해서 변환:
  ```bash
  pnpm add fast-xml-parser
  ```
- 공공 API 는 간헐적으로 장애가 있으므로 **`throw` 하면 `cached()` 가 자동으로 이전 값 반환**합니다 (stale-while-revalidate). 이미 반영된 보호 로직.

### 3.3 자전거·보관함도 동일 패턴

`fetchBikes()`, `fetchLockers()` 도 같은 패턴으로 교체.
각 API 응답을 보고 `src/lib/types.ts` 의 `BikeStation`, `Locker` 타입에 맞춰
`normalize*()` 함수를 작성하세요.

---

## 4. 검증

### 4.1 환경변수 확인

```bash
# 로드된 키 자리수 확인 (키 유출 없이)
node -e 'console.log("key length:", (process.env.DATA_GO_KR_KEY||"").length)'
```

### 4.2 로컬 호출 테스트

```bash
pnpm dev
# 별도 터미널에서
curl -s http://localhost:3001/api/libraries | jq '.data[0]'
```

mock 과 다른 **실제 기관명**이 나오면 성공.

### 4.3 자동 검증 스크립트 재실행

```bash
BASE_URL=http://localhost:3001 node scripts/verify.mjs
```

24개 어설션이 모두 통과하는지 확인.
통과하지 않으면:
- "seat arithmetic mismatch" → normalize 수식 재검토
- "data not array" → 응답 경로(예: `json.response.body.items.item`) 재확인

---

## 5. 자주 발생하는 문제와 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| `SERVICE_KEY_IS_NOT_REGISTERED_ERROR` | 승인 지연 | 마이페이지 승인 상태 확인, 1시간 뒤 재시도 |
| 응답이 HTML 에러 페이지 | `serviceKey` URL 인코딩 문제 | Encoding 버전 키 사용, 이미 인코딩된 값이라 `URLSearchParams` 가 **한 번 더 인코딩**하면 `%` 가 `%25` 가 됨 → `url.search = "serviceKey=" + API_KEY + "&..."` 로 직접 연결 |
| CORS 오류 | — | 본 앱은 **서버측 프록시**라 CORS 영향 없음. 만약 발생하면 `src/app/api/*` 에서 호출하고 있는지 확인 |
| `429 Too Many Requests` | Rate Limit | `cached()` TTL 을 5분 → 10분으로 상향 |
| 일부 도서관 좌표 누락 | 원본 데이터 품질 | `normalize` 단계에서 좌표 없는 항목 필터링 |

---

## 6. 체크리스트

- [ ] 공공데이터포털 회원가입 완료
- [ ] 3종 API 모두 활용신청 승인 확인
- [ ] Encoding 인증키를 `.env.local` 에 설정
- [ ] `sources.ts` 의 `fetchLibraries`, `fetchBikes`, `fetchLockers` 모두 실 API 호출로 교체
- [ ] `scripts/verify.mjs` 24/24 PASS
- [ ] 앱에서 실 기관명이 노출되는지 육안 확인
- [ ] `pnpm build` 통과
- [ ] 변경 사항 git commit

완료되면 **02. Vercel 배포** 로 이동.
