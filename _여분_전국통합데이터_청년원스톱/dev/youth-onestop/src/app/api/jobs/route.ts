/**
 * GET /api/jobs?category=일자리|훈련&region=서울
 */

import { NextResponse } from "next/server";
import { MOCK_JOBS } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const region = url.searchParams.get("region");

  let items = MOCK_JOBS;
  if (category) items = items.filter((j) => j.category === category);
  if (region) items = items.filter((j) => j.region === region);

  return NextResponse.json({ _mode: "mock", total: items.length, items });
}
