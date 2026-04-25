/**
 * POST /api/plan — 5단계 동선 JSON 반환.
 */

import { NextResponse } from "next/server";
import { buildPlan } from "@/lib/plan-builder";
import type { PlanRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as PlanRequest;
  const plan = await buildPlan(body);
  return NextResponse.json({ _mode: "mock", plan });
}

export async function GET() {
  const plan = await buildPlan({});
  return NextResponse.json({ _mode: "mock", plan });
}
