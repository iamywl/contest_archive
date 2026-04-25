/**
 * GET /api/shelters
 *
 * 공공데이터포털 "무더위쉼터/한파쉼터" API 프록시.
 * - 인증키(`PUBLIC_DATA_API_KEY`) 없으면 Mock fixture (`shelters.json`) 로 폴백.
 * - 5분 TTL + stale-while-revalidate 캐시 (`fetchPublic` 기본값).
 *
 * Query:
 *   - near=lat,lng    (선택) 반경 필터. 미지정 시 전체 반환.
 *   - radiusKm=1      (선택, 기본 1.5km)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fetchPublic, hasApiKey } from "@/lib/public-api-proxy";
import type { Shelter, SheltersResponse } from "@/lib/types";

// Node 런타임 강제 — fs 로 mock fixture 읽기 때문.
export const runtime = "nodejs";

const PUBLIC_DATA_ENDPOINT =
  "https://apis.data.go.kr/1741000/HeatWaveShelter/getShelters"; // 스키마 예시. 실제 운영 시 교체.

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const near = searchParams.get("near");
  const radiusKm = Number(searchParams.get("radiusKm") ?? "1.5");

  const apiKey = process.env.PUBLIC_DATA_API_KEY ?? "";
  const upstreamUrl = hasApiKey()
    ? `${PUBLIC_DATA_ENDPOINT}?serviceKey=${encodeURIComponent(apiKey)}&type=json`
    : PUBLIC_DATA_ENDPOINT; // 키가 없으면 어차피 mock 으로 폴백

  let data: SheltersResponse;
  try {
    data = await fetchPublic<SheltersResponse>(upstreamUrl, {
      mockFixture: "shelters.json",
      ttlMs: 5 * 60 * 1000,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "쉼터 데이터를 불러오지 못했습니다.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }

  let items: Shelter[] = Array.isArray(data.items) ? data.items : [];

  if (near) {
    const [latStr, lngStr] = near.split(",");
    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      items = items
        .map((shelter) => ({
          shelter,
          distanceKm: haversineKm(lat, lng, shelter.lat, shelter.lng),
        }))
        .filter(({ distanceKm }) => distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .map(({ shelter }) => shelter);
    }
  }

  return NextResponse.json({
    ...data,
    totalCount: items.length,
    items,
    _mode: hasApiKey() ? "live" : "mock",
  });
}
