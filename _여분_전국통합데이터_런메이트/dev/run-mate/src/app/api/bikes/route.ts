import { NextResponse } from "next/server";
import { loadMock } from "@/lib/mock";
import type { BikesResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const near = searchParams.get("near");
  const data = await loadMock<BikesResponse>("bikes.json");

  if (!near) return NextResponse.json(data);

  const [lat, lng] = near.split(",").map(Number);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json(data);
  }

  const items = [...data.items]
    .map((s) => ({
      ...s,
      _distKm: haversine(lat, lng, s.lat, s.lng),
    }))
    .sort((a, b) => a._distKm - b._distKm)
    .slice(0, 10);

  return NextResponse.json({ ...data, items });
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
