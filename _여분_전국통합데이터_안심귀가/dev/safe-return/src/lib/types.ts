/**
 * 안심귀가 공용 타입.
 *
 * 제안서 §2.2 "밝기 점수" 모델에 대응한다. Brightness score S ∈ [0,1] 은
 * CCTV·가로등·편의점·지구대의 반경 50m 밀도 가중합이며, 0.7↑ 를 "밝음",
 * 0.4↑ 를 "보통", 그 미만을 "어두움" 으로 분류한다.
 */

export type LatLng = { lat: number; lng: number };

export type PoiType = "cctv" | "lamp" | "cvs" | "station" | "scout";

export type Poi = {
  id: string;
  type: PoiType;
  lat: number;
  lng: number;
  name?: string;
};

export type RouteTone = "ok" | "warn" | "bad";

export type RouteCandidate = {
  id: string;
  tone: RouteTone;
  label: string;
  /** S ∈ [0,1] */
  brightness: number;
  /** 미터 */
  distanceMeters: number;
  /** 예상 도보 소요 (분) */
  etaMinutes: number;
  /** 경로 폴리라인 */
  path: LatLng[];
  /** 경로 설명 */
  summary: string;
};

export type RouteRequest = {
  origin: LatLng;
  destination: LatLng;
  /** 출발지 텍스트 (검색어·주소) */
  originLabel?: string;
  destinationLabel?: string;
};

export type TriageLevel = "daily" | "potential" | "emergency";

export type TriageResponse = {
  level: TriageLevel;
  confidence: number;
  advice: string;
  next_actions: string[];
};
