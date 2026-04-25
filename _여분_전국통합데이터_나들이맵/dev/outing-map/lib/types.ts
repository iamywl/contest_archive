/**
 * 나들이맵 핵심 도메인 타입.
 *
 * 공공데이터포털 스키마를 그대로 쓰지 않고, 지자체별 편차를 흡수한
 * 내부 표준 형식으로 통일한다 (`lib/adapters/` 에서 변환 — Phase 1 범위 외).
 */

export type GeoPoint = {
  lat: number;
  lng: number;
};

export type Parking = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  capacity: number;
  occupied: number;
  available: number;
  feeKrwPer30Min: number;
  operatingHours: string;
  accessible: boolean;
};

export type Toilet = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  babyChange: boolean;
  kidsToilet: boolean;
  accessible: boolean;
  open24h: boolean;
};

export type NursingRoom = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  hasNursingRoom: boolean;
  hasBabyChange: boolean;
  hasWarmer: boolean;
  menOk: boolean;
  operatingHours: string;
};

export type KidsLibrary = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  kidsRoom: boolean;
  seats: number;
  occupied: number;
  strollerOk: boolean;
  operatingHours: string;
  closedDay: string;
};

export type Park = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  playground: boolean;
  strollerOk: boolean;
  shade: boolean;
  restroom: boolean;
  openType: string;
};

export type PoiKind = "parking" | "toilet" | "nursing" | "kidslib" | "park";

export type Poi = {
  id: string;
  kind: PoiKind;
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** POI 타입별 요약 (혼잡·이용 가능 수 등) */
  summary: string;
  /** 유아 친화 여부 (기저귀교환·수유·유모차·유아좌변기 등을 종합). */
  babyFriendly: boolean;
  /** 원 데이터 일부 */
  raw?: unknown;
};

export type PlanStep = {
  step: number;
  stage: "주차" | "화장실" | "수유실" | "공원" | "복귀";
  poiId: string;
  name: string;
  address: string;
  reason: string;
  etaMinutes: number;
};

export type PlanResult = {
  destination: string;
  generatedAt: string;
  weather: string;
  steps: PlanStep[];
  totalEtaMinutes: number;
  babyFriendly: boolean;
};

export type PlanRequest = {
  destination?: string;
  lat?: number;
  lng?: number;
  kidCount?: number;
  kidAge?: "baby" | "toddler" | "preschool";
  babyFriendly?: boolean;
};
