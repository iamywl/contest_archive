/**
 * POST /api/matches
 *
 * Body: YouthProfile → 매칭 점수 상위 N건을 반환.
 */

import { NextResponse } from "next/server";
import { MOCK_POLICIES } from "@/lib/mock-data";
import { matchProfile } from "@/lib/matching";
import type { YouthProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const profile = (await request.json()) as YouthProfile;
  const scored = matchProfile(profile, MOCK_POLICIES);
  return NextResponse.json({
    _mode: "mock",
    total: scored.length,
    items: scored,
  });
}
