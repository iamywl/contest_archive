import { NextResponse } from "next/server";
import { loadMock } from "@/lib/mock";
import { computeSignal } from "@/lib/signal";

export const dynamic = "force-dynamic";

export async function GET() {
  const [aq, weather] = await Promise.all([
    loadMock("air-quality.json"),
    loadMock("weather.json"),
  ]);
  const signal = computeSignal(
    aq as Parameters<typeof computeSignal>[0],
    weather as Parameters<typeof computeSignal>[1],
  );
  return NextResponse.json(signal);
}
