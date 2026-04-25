/**
 * GET /api/policies
 *
 * 쿼리:
 *   - region: 지역 필터
 *   - category: 카테고리 필터
 *   - source: 정책 출처 필터
 *
 * 본 PoC 는 mock 데이터만 반환. 실데이터 연동 시 온통청년/LH/고용24 공공 API 를
 * `_여분_공유/lib/public-api-proxy.ts` 로 중계하도록 교체한다.
 */

import { NextResponse } from "next/server";
import { MOCK_POLICIES } from "@/lib/mock-data";
import type { Policy, PolicyCategory, RegionCode } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const region = url.searchParams.get("region") as RegionCode | null;
  const category = url.searchParams.get("category") as PolicyCategory | null;
  const source = url.searchParams.get("source");

  let items: Policy[] = MOCK_POLICIES;
  if (region) {
    items = items.filter((p) => p.region === region || p.region === "전국");
  }
  if (category) {
    items = items.filter((p) => p.category === category);
  }
  if (source) {
    items = items.filter((p) => p.source === source);
  }

  return NextResponse.json({
    _mode: "mock",
    total: items.length,
    items,
  });
}
