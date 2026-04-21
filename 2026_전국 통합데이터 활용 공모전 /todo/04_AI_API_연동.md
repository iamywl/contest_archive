# 04. (선택) AI API 연동 — 규칙기반 → 실 LLM 전환

**목표**: `POST /api/ai/chat` 의 규칙 기반 에이전트를 **실제 LLM(OpenAI/Anthropic) Tool-use** 로 교체한다.
**예상 소요**: 2시간
**우선순위**: 선택 — 현재 규칙기반도 심사 가점 요건은 충족하나, 실 LLM 이면 더 인상적.

---

## 0. 현재 상태

`src/app/api/ai/chat/route.ts` 는 공공데이터 3종(도서관·자전거·보관함)을
조회해 결합 추천을 생성하는 **규칙 기반 에이전트**입니다.

```ts
// 현재: 규칙 + 키워드 매칭
if (/비|우천|rain|날씨/.test(q)) tone.push("비 오는 날엔...");
```

LLM 으로 교체하면:
- 입력을 파싱하지 않고 **의도 자체를 이해**
- 대화형 후속 질문 가능
- 더 자연스러운 추천 문구

---

## 1. 선택지 비교

| 옵션 | 장점 | 단점 | 월 예상 비용 |
|---|---|---|---|
| **OpenAI GPT-4o-mini** | 저렴, Tool-use 안정, 한국어 자연 | API 비용 있음 | $1~$10 |
| **Anthropic Claude Haiku** | 한국어·긴 맥락 강점, Tool-use 직관 | 약간 더 비쌈 | $2~$15 |
| **Google Gemini 1.5 Flash** | 무료 티어 넉넉 | Tool-use 구성 조금 복잡 | $0~$5 |
| **오픈소스 (Qwen/Llama)** | 로컬/무료 | 서버 비용·응답 품질 | 서버비만 |

**추천**: 시연 안정성 우선이면 **OpenAI GPT-4o-mini**.

---

## 2. OpenAI 방식 (상세)

### 2.1 키 발급

1. https://platform.openai.com/signup → 가입
2. **Billing** 에 카드 등록 (필수)
3. **API Keys** → Create new secret key
4. 키 복사 → `.env.local` 에 추가:
   ```
   OPENAI_API_KEY=sk-...
   ```
5. Vercel Environment Variables 에도 동일 키 추가 → **Redeploy**

### 2.2 SDK 설치

```bash
cd dev/chekcin
pnpm add openai
```

### 2.3 코드 교체

`src/app/api/ai/chat/route.ts` 전체를 다음 패턴으로 수정:

```typescript
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { fetchBikes, fetchLibraries, fetchLockers } from "@/lib/data/sources";
import { haversineKm } from "@/lib/utils";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const SYSTEM = `너는 한국의 공공데이터를 활용해 학습자에게 실시간으로
도서관/자전거/보관함 조합을 추천하는 친근한 코치야. 항상 필요한 도구를
호출해 실제 데이터를 근거로 답해. 이모지(📚🚲🔒)를 가볍게 써도 좋아.
답변은 3문장 이내로 간결하게.`;

const tools = [
  {
    type: "function",
    function: {
      name: "search_libraries",
      description: "내 위치 기준 가까운 공공도서관을 잔여좌석과 함께 반환",
      parameters: {
        type: "object",
        properties: {
          lat: { type: "number" },
          lng: { type: "number" },
          minAvailable: { type: "number", description: "최소 잔여 좌석", default: 1 },
        },
        required: ["lat", "lng"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "nearby_bikes",
      description: "지정 좌표 근처 공영자전거 대여소를 반환",
      parameters: {
        type: "object",
        properties: {
          lat: { type: "number" },
          lng: { type: "number" },
        },
        required: ["lat", "lng"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "nearby_lockers",
      description: "지정 좌표 근처 공영 물품보관함을 반환",
      parameters: {
        type: "object",
        properties: {
          lat: { type: "number" },
          lng: { type: "number" },
        },
        required: ["lat", "lng"],
      },
    },
  },
] as const;

async function runTool(name: string, args: any) {
  if (name === "search_libraries") {
    const libs = await fetchLibraries();
    return libs
      .filter((l) => l.seats.available >= (args.minAvailable ?? 1))
      .map((l) => ({
        ...l,
        distKm: haversineKm({ lat: args.lat, lng: args.lng }, l.location),
      }))
      .sort((a, b) => a.distKm - b.distKm)
      .slice(0, 3);
  }
  if (name === "nearby_bikes") {
    const bikes = await fetchBikes();
    return bikes
      .map((b) => ({ ...b, distKm: haversineKm({ lat: args.lat, lng: args.lng }, b.location) }))
      .sort((a, b) => a.distKm - b.distKm)
      .slice(0, 3);
  }
  if (name === "nearby_lockers") {
    const lockers = await fetchLockers();
    return lockers
      .map((l) => ({ ...l, distKm: haversineKm({ lat: args.lat, lng: args.lng }, l.location) }))
      .sort((a, b) => a.distKm - b.distKm)
      .slice(0, 3);
  }
  return { error: "unknown tool" };
}

export async function POST(req: Request) {
  const { message, location } = (await req.json()) as {
    message: string;
    location?: { lat: number; lng: number };
  };
  if (!message) return NextResponse.json({ error: "empty" }, { status: 400 });

  const userLoc = location ?? { lat: 37.5371, lng: 127.0831 };
  const messages: any[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: `현재 위치: ${userLoc.lat},${userLoc.lng}\n질문: ${message}` },
  ];

  // Tool-use 루프 (최대 3회 반복)
  for (let step = 0; step < 3; step++) {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools,
      tool_choice: "auto",
    });
    const msg = resp.choices[0].message;
    messages.push(msg);

    const toolCalls = msg.tool_calls ?? [];
    if (toolCalls.length === 0) {
      return NextResponse.json({ reply: msg.content, model: "gpt-4o-mini" });
    }

    for (const tc of toolCalls) {
      const args = JSON.parse(tc.function.arguments || "{}");
      const result = await runTool(tc.function.name, args);
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }
  }

  return NextResponse.json({
    reply: "응답을 생성하지 못했습니다. 다시 시도해주세요.",
    model: "gpt-4o-mini",
  });
}
```

### 2.4 테스트

```bash
curl -X POST http://localhost:3001/api/ai/chat \
  -H 'content-type: application/json' \
  -d '{"message":"비 오는데 지금 공부할 곳?", "location":{"lat":37.5371,"lng":127.0831}}' \
  | jq '.reply'
```

응답이 규칙기반과 달리 **자연스러운 문장**으로 오면 성공.

---

## 3. Anthropic Claude 방식 (선택)

OpenAI 대신 Anthropic 쓰려면 위 코드를 다음 패턴으로 교체.

### 3.1 설치 & 키

```bash
pnpm add @anthropic-ai/sdk
```

`.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3.2 핵심 차이

```typescript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const resp = await anthropic.messages.create({
  model: "claude-haiku-4-5",
  max_tokens: 1024,
  system: SYSTEM,
  tools: tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  })),
  messages: [{ role: "user", content: `...` }],
});
```

응답의 `content` 배열에서 `type: "tool_use"` 블록을 골라 도구 실행 후,
결과를 `role: "user"` 의 `tool_result` 로 이어 보내는 루프.
자세한 예시: https://docs.anthropic.com/en/docs/tool-use

---

## 4. 캐싱으로 비용 절감

같은 질문이 반복되면 LLM 호출을 피하도록:

```typescript
// src/lib/data/cache.ts 이미 있음
import { cached } from "@/lib/data/cache";

const cacheKey = `chat:${crypto.createHash('md5').update(message+JSON.stringify(location)).digest('hex')}`;
const reply = await cached(cacheKey, 60, async () => {
  // LLM 호출
});
```

---

## 5. 에러 핸들링

LLM API 실패 시 **규칙기반으로 폴백**하도록:

```typescript
try {
  // LLM 경로
} catch (err) {
  console.error("LLM failed, falling back to rule-based", err);
  const reply = await ruleBasedAgent(message, userLoc);
  return NextResponse.json({ reply, model: "fallback-rule" });
}
```

기존 `ruleBasedAgent()` 함수를 삭제하지 말고 fallback 으로 보존.

---

## 6. 비용 모니터링

### OpenAI
- https://platform.openai.com/usage → 일별 사용량 확인
- **Usage limits** 에서 월 $10 같은 하드 캡 설정 권장

### 비용 계산식 (gpt-4o-mini, 2026 기준)
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens
- 평균 대화 1건 ≈ 2,000 tokens ≈ **$0.0006 (약 0.8원)**
- 월 10,000 질의 ≈ $6 (약 8,000원)

공모전 데모 트래픽에는 충분히 저렴.

---

## 7. 체크리스트

- [ ] 선호 제공자 선택 (OpenAI / Anthropic / Gemini)
- [ ] API 키 발급 및 결제 수단 등록
- [ ] `.env.local` + Vercel Environment Variables 에 키 추가
- [ ] `src/app/api/ai/chat/route.ts` 코드 교체
- [ ] 로컬에서 curl 테스트
- [ ] `scripts/verify.mjs` 통과 (기존 어설션 — 3종 키워드 포함)
- [ ] `scripts/e2e.mjs` 통과
- [ ] 폴백 경로 (LLM 실패 시 규칙기반) 설정
- [ ] 월 사용량 한도 설정
- [ ] Vercel 재배포 후 모바일에서 실 동작 확인

완료 시 [02_Vercel_배포.md](02_Vercel_배포.md) 의 재배포 절차로 이동.
