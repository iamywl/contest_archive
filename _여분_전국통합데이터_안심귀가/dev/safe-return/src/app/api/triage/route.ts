import { NextResponse } from "next/server";
import type { TriageLevel, TriageResponse } from "@/lib/types";

export const runtime = "nodejs";

type Body = {
  text?: string;
  /** 흔들기 감지 트리거 여부. true 면 기본 potential 로 시작. */
  shakeDetected?: boolean;
};

/**
 * 긴급 상황 3단계 분류.
 *
 * 프로덕션에서는 Ollama qwen2.5:7b-instruct-q4_K_M + `outlines` JSON schema 로
 * 분류하지만, MVP 스캐폴드 단계에선 결정론적 키워드 규칙으로 mock 한다.
 * 로컬 LLM 연동은 `_여분_공유/lib/local-llm.ts` 를 통해 후속 확장.
 */

const EMERGENCY_KEYWORDS = [
  "112",
  "살려",
  "따라와",
  "위협",
  "폭행",
  "납치",
  "강도",
  "무서워",
  "쫓아",
];
const POTENTIAL_KEYWORDS = [
  "이상",
  "불안",
  "수상",
  "어두워",
  "혼자",
  "낯선",
  "취객",
];

function classify(text: string): TriageLevel {
  const lower = text.toLowerCase();
  if (EMERGENCY_KEYWORDS.some((k) => lower.includes(k))) return "emergency";
  if (POTENTIAL_KEYWORDS.some((k) => lower.includes(k))) return "potential";
  return "daily";
}

const ADVICE: Record<TriageLevel, Omit<TriageResponse, "level" | "confidence">> =
  {
    daily: {
      advice:
        "일상 수준의 불안 신호입니다. 가까운 편의점·가로등이 밝은 구간을 안내합니다.",
      next_actions: ["가까운 편의점 안내", "보호자 공유 링크 준비"],
    },
    potential: {
      advice:
        "잠재 위협 신호로 분류되었습니다. 보호자에게 실시간 위치 공유를 시작하세요.",
      next_actions: [
        "보호자에게 위치 SMS 발송",
        "가장 밝은 경로로 재탐색",
        "근처 지구대 위치 안내",
      ],
    },
    emergency: {
      advice:
        "즉시 긴급 상황으로 분류되었습니다. 3초 카운트다운 후 112 딥링크를 엽니다.",
      next_actions: [
        "112 딥링크 (tel:112) 실행",
        "보호자 긴급 SMS 일괄 발송",
        "주변 지구대·경찰서 마커 강조",
      ],
    },
  };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  let level: TriageLevel;
  let confidence: number;

  if (body.shakeDetected && !text) {
    // 흔들기 단독 트리거는 즉시 emergency 로 하지 않는다 (제안서 §5.3 오탐 방지).
    level = "potential";
    confidence = 0.6;
  } else if (!text) {
    level = "daily";
    confidence = 0.5;
  } else {
    level = classify(text);
    confidence = level === "daily" ? 0.55 : level === "potential" ? 0.72 : 0.88;
  }

  const payload: TriageResponse = {
    level,
    confidence,
    ...ADVICE[level],
  };

  return NextResponse.json(payload);
}
