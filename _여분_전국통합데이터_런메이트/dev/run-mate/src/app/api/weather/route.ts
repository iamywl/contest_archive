import { NextResponse } from "next/server";
import { loadMock } from "@/lib/mock";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await loadMock("weather.json");
  return NextResponse.json(data);
}
