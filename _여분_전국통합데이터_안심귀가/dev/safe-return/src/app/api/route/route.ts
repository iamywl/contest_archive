import { NextResponse } from "next/server";
import { brightnessTone, scoreBrightness, toneLabel } from "@/lib/brightness";
import { loadCctvPois } from "@/lib/cctv-loader";
import { interpolate, offsetPath, pathLengthMeters } from "@/lib/geo";
import { NON_CCTV_POIS } from "@/lib/mock-pois";
import type { LatLng, RouteCandidate } from "@/lib/types";

export const runtime = "nodejs";

type Body = {
  origin: LatLng;
  destination: LatLng;
};

const WALK_SPEED_M_PER_MIN = 70; // 도보 4.2km/h ≈ 70m/min

function toEta(meters: number): number {
  return Math.max(1, Math.round(meters / WALK_SPEED_M_PER_MIN));
}

/**
 * 더미 경로 3개를 생성한다.
 *  - direct: 직선 경로 (가장 짧지만 밝기 랜덤)
 *  - via-lit: CCTV·편의점 밀집 쪽으로 우회 (+60m 수직 오프셋)
 *  - detour: 반대 방향 우회 (주택가, 보통 어둠)
 */
function buildCandidates(origin: LatLng, destination: LatLng): LatLng[][] {
  const direct = interpolate(origin, destination, 18);
  const lit = offsetPath(origin, destination, 60, 18);
  const detour = offsetPath(origin, destination, -80, 18);
  return [direct, lit, detour];
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!body.origin || !body.destination) {
    return NextResponse.json(
      { error: "origin, destination required" },
      { status: 400 },
    );
  }

  const cctv = await loadCctvPois();
  const allPois = [...cctv, ...NON_CCTV_POIS];
  const paths = buildCandidates(body.origin, body.destination);

  const scored: RouteCandidate[] = paths.map((path, i) => {
    const brightness = scoreBrightness(path, allPois);
    const distance = pathLengthMeters(path);
    const tone = brightnessTone(brightness);
    const summaryByIdx = [
      "직선 경로 — 거리 최단, 밝기는 실측값",
      "우회 경로 — CCTV·편의점 밀집 구간을 따라감",
      "우회 경로 — 주택가 골목, 인적 드묾",
    ];
    return {
      id: `route-${i + 1}`,
      tone,
      label: toneLabel(tone),
      brightness,
      distanceMeters: Math.round(distance),
      etaMinutes: toEta(distance),
      path,
      summary: summaryByIdx[i] ?? "",
    };
  });

  // ok → warn → bad 순서로 정렬해 "밝은 길 추천" UX 강화
  const toneOrder: Record<string, number> = { ok: 0, warn: 1, bad: 2 };
  scored.sort((a, b) => toneOrder[a.tone] - toneOrder[b.tone]);

  return NextResponse.json({
    routes: scored,
    pois: allPois,
    generatedAt: new Date().toISOString(),
  });
}
