/**
 * GET /api/pois?kinds=parking,toilet,nursing,kidslib,park — 통합 POI 목록.
 */

import { NextResponse } from "next/server";
import {
  loadKidsLib,
  loadNursing,
  loadParking,
  loadParks,
  loadToilets,
} from "@/lib/mock-loader";
import type { Poi, PoiKind } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kinds = (url.searchParams.get("kinds") ?? "parking,toilet,nursing,kidslib,park")
    .split(",")
    .map((k) => k.trim()) as PoiKind[];

  const items: Poi[] = [];

  if (kinds.includes("parking")) {
    for (const p of await loadParking()) {
      items.push({
        id: `parking-${p.id}`,
        kind: "parking",
        name: p.name,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
        summary: `잔여 ${p.available}/${p.capacity}면 · ${p.feeKrwPer30Min}원/30분`,
        babyFriendly: p.accessible,
      });
    }
  }

  if (kinds.includes("toilet")) {
    for (const t of await loadToilets()) {
      items.push({
        id: `toilet-${t.id}`,
        kind: "toilet",
        name: t.name,
        address: t.address,
        lat: t.lat,
        lng: t.lng,
        summary: [
          t.babyChange ? "기저귀교환대" : null,
          t.kidsToilet ? "유아좌변기" : null,
          t.accessible ? "장애인화장실" : null,
          t.open24h ? "24시간" : null,
        ]
          .filter(Boolean)
          .join(" · ") || "일반 화장실",
        babyFriendly: t.babyChange || t.kidsToilet,
      });
    }
  }

  if (kinds.includes("nursing")) {
    for (const n of await loadNursing()) {
      items.push({
        id: `nursing-${n.id}`,
        kind: "nursing",
        name: n.name,
        address: n.address,
        lat: n.lat,
        lng: n.lng,
        summary: [
          n.hasNursingRoom ? "수유실" : null,
          n.hasBabyChange ? "교환대" : null,
          n.hasWarmer ? "워머" : null,
          n.menOk ? "부·가족실" : "여성전용",
        ]
          .filter(Boolean)
          .join(" · "),
        babyFriendly: n.hasNursingRoom,
      });
    }
  }

  if (kinds.includes("kidslib")) {
    for (const k of await loadKidsLib()) {
      items.push({
        id: `kidslib-${k.id}`,
        kind: "kidslib",
        name: k.name,
        address: k.address,
        lat: k.lat,
        lng: k.lng,
        summary: `어린이실 잔여 ${k.seats - k.occupied}/${k.seats}석${k.strollerOk ? " · 유모차 OK" : ""}`,
        babyFriendly: k.kidsRoom && k.strollerOk,
      });
    }
  }

  if (kinds.includes("park")) {
    for (const p of await loadParks()) {
      items.push({
        id: `park-${p.id}`,
        kind: "park",
        name: p.name,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
        summary: [
          p.playground ? "놀이터" : null,
          p.shade ? "그늘" : null,
          p.strollerOk ? "유모차 OK" : null,
          p.restroom ? "화장실" : null,
        ]
          .filter(Boolean)
          .join(" · "),
        babyFriendly: p.playground && p.strollerOk && p.restroom,
      });
    }
  }

  return NextResponse.json({ _mode: "mock", total: items.length, items });
}
