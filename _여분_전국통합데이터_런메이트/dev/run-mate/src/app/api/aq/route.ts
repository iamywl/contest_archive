import { NextResponse } from "next/server";
import { loadMock } from "@/lib/mock";

export const dynamic = "force-dynamic";

export async function GET() {
  // 심사/데모 환경 기본: mock. 인증키 보유 시 public-api-proxy 로 교체.
  const data = await loadMock("air-quality.json");
  return NextResponse.json(data);
}
