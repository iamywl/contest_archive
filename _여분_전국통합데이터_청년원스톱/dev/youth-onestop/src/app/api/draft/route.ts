/**
 * POST /api/draft
 *
 * 로컬 Ollama LLM 이 가동 중이면 신청서 초안을 JSON 으로 생성.
 * 미가동 시 템플릿 기반 폴백을 반환해 UI 흐름을 유지한다.
 */

import { NextResponse } from "next/server";
import { ollamaChatJson } from "@/lib/local-llm";
import { MOCK_POLICIES } from "@/lib/mock-data";
import type { DraftRequest, DraftResponse, Policy, YouthProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

function templateDraft(profile: YouthProfile, policy: Policy, note?: string): DraftResponse {
  const title = `${policy.title} 신청서 초안 — ${profile.region} / ${profile.age}세`;
  return {
    backend: "template",
    title,
    sections: [
      {
        heading: "1. 신청 목적",
        body:
          `본인은 ${profile.region} 지역 ${profile.age}세 청년으로, ` +
          `현재 ${humanize(profile.employment)} 상태이며 ` +
          `${humanize(profile.housing, "주거")} 여건을 감안해 ${policy.title} 에 신청합니다.` +
          (note ? `\n추가 사항: ${note}` : ""),
      },
      {
        heading: "2. 지원 사유",
        body: policy.summary + "\n본 사업의 취지에 부합한다 판단하여 신청합니다.",
      },
      {
        heading: "3. 구비 서류",
        body: policy.documents.map((d, i) => `${i + 1}) ${d}`).join("\n"),
      },
      {
        heading: "4. 개인정보 처리 동의",
        body:
          "본 신청서는 로컬 기기에서만 생성되었으며, 서버에 원본 개인정보를 저장하지 않습니다. " +
          "실제 접수 시 기관이 요구하는 동의서를 별도 제출해야 합니다.",
      },
    ],
    warnings: [
      "템플릿 기반 자동 생성 — 제출 전 본인의 상황에 맞게 편집 필요.",
      "기관이 요구하는 세부 서식(한글/엑셀) 이 있으면 그 서식을 우선 사용.",
    ],
  };
}

function humanize(value: string, kind: string = ""): string {
  const map: Record<string, string> = {
    student: "학생",
    job_seeker: "구직자",
    employed: "재직자",
    freelancer: "프리랜서",
    starter: "창업자",
    rent: "월세 거주",
    own: "자가 소유",
    dorm: "기숙사 거주",
    family: "가족과 거주",
    low: "저소득층",
    mid: "중간소득층",
    high: "고소득층",
  };
  return map[value] ?? (kind ? `${kind} 정보 미상` : value);
}

export async function POST(request: Request) {
  const body = (await request.json()) as DraftRequest;
  const policy = MOCK_POLICIES.find((p) => p.id === body.policyId);
  if (!policy) {
    return NextResponse.json({ error: "policy not found" }, { status: 404 });
  }

  const messages = [
    {
      role: "system" as const,
      content:
        "당신은 한국의 청년 정책 신청서 작성자이다. " +
        "사용자의 범주형 프로파일과 정책 요약을 바탕으로 " +
        "신청서 초안을 JSON 스키마에 맞춰 생성한다. " +
        "개인정보 원본을 만들어내지 말고 일반적 문장으로만 작성한다.",
    },
    {
      role: "user" as const,
      content: JSON.stringify({
        profile: body.profile,
        policy: {
          id: policy.id,
          title: policy.title,
          summary: policy.summary,
          documents: policy.documents,
        },
        note: body.extraNote ?? "",
        schema: {
          title: "string",
          sections: [{ heading: "string", body: "string" }],
          warnings: ["string"],
        },
      }),
    },
  ];

  const llm = await ollamaChatJson<Omit<DraftResponse, "backend">>(messages, {
    model: "qwen2.5:32b-instruct-q4_K_M",
    temperature: 0.2,
    timeoutMs: 120_000,
  });

  if (llm && llm.sections?.length) {
    return NextResponse.json({ ...llm, backend: "ollama" } satisfies DraftResponse);
  }

  return NextResponse.json(templateDraft(body.profile, policy, body.extraNote));
}
