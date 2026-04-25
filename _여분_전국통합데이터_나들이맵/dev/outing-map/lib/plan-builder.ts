/**
 * 5단계 동선 카드 mock 빌더.
 *
 * Phase 1: 거리 기반 그리디 선택 (주차 → 화장실 → 수유실 → 공원 → 복귀).
 * Phase 2: `_여분_공유/lib/local-llm.ts` 의 Ollama `chat` Tool-use 로 교체.
 */

import type {
  GeoPoint,
  KidsLibrary,
  NursingRoom,
  Park,
  Parking,
  PlanRequest,
  PlanResult,
  PlanStep,
  Toilet,
} from "./types";
import { haversineKm } from "./distance";
import {
  loadKidsLib,
  loadNursing,
  loadParking,
  loadParks,
  loadToilets,
  loadWeatherSummary,
} from "./mock-loader";

const DEFAULT_CENTER: GeoPoint = { lat: 37.5664, lng: 126.9779 }; // 서울시청

function nearest<T extends { lat: number; lng: number }>(
  items: T[],
  center: GeoPoint,
): T | undefined {
  if (items.length === 0) return undefined;
  return [...items].sort(
    (a, b) => haversineKm(center, a) - haversineKm(center, b),
  )[0];
}

function pickParking(parks: Parking[], center: GeoPoint, babyFriendly: boolean): Parking | undefined {
  const candidates = parks.filter(
    (p) => p.available > 0 && (!babyFriendly || p.accessible),
  );
  return nearest(candidates.length ? candidates : parks, center);
}

function pickToilet(toilets: Toilet[], center: GeoPoint, babyFriendly: boolean): Toilet | undefined {
  const candidates = babyFriendly
    ? toilets.filter((t) => t.babyChange && t.accessible)
    : toilets;
  return nearest(candidates.length ? candidates : toilets, center);
}

function pickNursing(rooms: NursingRoom[], center: GeoPoint): NursingRoom | undefined {
  const candidates = rooms.filter((r) => r.hasNursingRoom);
  return nearest(candidates.length ? candidates : rooms, center);
}

function pickPark(parks: Park[], center: GeoPoint, babyFriendly: boolean): Park | undefined {
  const candidates = babyFriendly
    ? parks.filter((p) => p.playground && p.strollerOk && p.restroom)
    : parks;
  return nearest(candidates.length ? candidates : parks, center);
}

function pickLibrary(libs: KidsLibrary[], center: GeoPoint): KidsLibrary | undefined {
  return nearest(
    libs.filter((l) => l.kidsRoom),
    center,
  );
}

function etaMinutes(from: GeoPoint, to: { lat: number; lng: number }): number {
  // 보행 평균 4km/h 가정 → 분 환산. 소수점 반올림.
  const km = haversineKm(from, to);
  return Math.max(3, Math.round((km / 4) * 60));
}

export async function buildPlan(req: PlanRequest): Promise<PlanResult> {
  const center: GeoPoint = {
    lat: req.lat ?? DEFAULT_CENTER.lat,
    lng: req.lng ?? DEFAULT_CENTER.lng,
  };
  const babyFriendly = req.babyFriendly ?? true;

  const [parks, toilets, rooms, libs, playParks, weather] = await Promise.all([
    loadParking(),
    loadToilets(),
    loadNursing(),
    loadKidsLib(),
    loadParks(),
    loadWeatherSummary(),
  ]);

  const steps: PlanStep[] = [];
  let cursor: GeoPoint = center;
  let totalEta = 0;

  const parking = pickParking(parks, center, babyFriendly);
  if (parking) {
    const eta = etaMinutes(cursor, parking);
    steps.push({
      step: 1,
      stage: "주차",
      poiId: parking.id,
      name: parking.name,
      address: parking.address,
      reason: `실시간 잔여 ${parking.available}면 (전체 ${parking.capacity})${parking.accessible ? ", 장애인 전용면 있음" : ""}`,
      etaMinutes: eta,
    });
    cursor = { lat: parking.lat, lng: parking.lng };
    totalEta += eta;
  }

  const toilet = pickToilet(toilets, cursor, babyFriendly);
  if (toilet) {
    const eta = etaMinutes(cursor, toilet);
    steps.push({
      step: 2,
      stage: "화장실",
      poiId: toilet.id,
      name: toilet.name,
      address: toilet.address,
      reason: `${toilet.babyChange ? "기저귀교환대 " : ""}${toilet.kidsToilet ? "유아좌변기 " : ""}${toilet.accessible ? "장애인화장실 " : ""}보유`,
      etaMinutes: eta,
    });
    cursor = { lat: toilet.lat, lng: toilet.lng };
    totalEta += eta;
  }

  const nursing = pickNursing(rooms, cursor);
  if (nursing) {
    const eta = etaMinutes(cursor, nursing);
    steps.push({
      step: 3,
      stage: "수유실",
      poiId: nursing.id,
      name: nursing.name,
      address: nursing.address,
      reason: `${nursing.hasWarmer ? "젖병 워머 " : ""}${nursing.menOk ? "남성 출입 가능 " : "여성 전용 "}· ${nursing.operatingHours}`,
      etaMinutes: eta,
    });
    cursor = { lat: nursing.lat, lng: nursing.lng };
    totalEta += eta;
  }

  const park = pickPark(playParks, cursor, babyFriendly) ?? pickLibrary(libs, cursor);
  if (park) {
    const eta = etaMinutes(cursor, park);
    const isLib = "kidsRoom" in park;
    steps.push({
      step: 4,
      stage: "공원",
      poiId: park.id,
      name: park.name,
      address: park.address,
      reason: isLib
        ? `어린이실 잔여 ${(park as KidsLibrary).seats - (park as KidsLibrary).occupied}석 · 실내 놀이`
        : `${(park as Park).playground ? "놀이터 · " : ""}${(park as Park).shade ? "그늘 " : ""}${(park as Park).strollerOk ? "유모차 OK" : ""}`,
      etaMinutes: eta,
    });
    cursor = { lat: park.lat, lng: park.lng };
    totalEta += eta;
  }

  // 복귀: 출발지(또는 임의) 로 반환하는 단계를 요약.
  {
    const eta = etaMinutes(cursor, center);
    steps.push({
      step: 5,
      stage: "복귀",
      poiId: "return",
      name: req.destination ?? "출발지",
      address: req.destination ?? "지정된 출발지",
      reason: "아이 컨디션에 맞춰 여유있게 귀가",
      etaMinutes: eta,
    });
    totalEta += eta;
  }

  return {
    destination: req.destination ?? "서울 도심",
    generatedAt: new Date().toISOString(),
    weather,
    steps,
    totalEtaMinutes: totalEta,
    babyFriendly,
  };
}
