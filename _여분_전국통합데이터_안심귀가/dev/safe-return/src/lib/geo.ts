import type { LatLng } from "./types";

const EARTH_RADIUS_M = 6_371_000;

/** Haversine 거리 (m). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 두 좌표 사이를 n 등분한 폴리라인. */
export function interpolate(a: LatLng, b: LatLng, n: number): LatLng[] {
  const points: LatLng[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    points.push({
      lat: a.lat + (b.lat - a.lat) * t,
      lng: a.lng + (b.lng - a.lng) * t,
    });
  }
  return points;
}

/** 경로(폴리라인) 총 거리. */
export function pathLengthMeters(path: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += distanceMeters(path[i - 1], path[i]);
  }
  return total;
}

/** 경로에 수직 방향 오프셋(미터)을 줘 "우회" 경로를 생성. */
export function offsetPath(
  origin: LatLng,
  destination: LatLng,
  offsetMeters: number,
  steps = 12,
): LatLng[] {
  // 수직 방향 벡터를 위경도로 근사한다. 1deg ≈ 111,320m.
  const dLat = destination.lat - origin.lat;
  const dLng = destination.lng - origin.lng;
  const len = Math.sqrt(dLat * dLat + dLng * dLng) || 1e-9;
  // 수직 단위 벡터 (lng, -lat) 정규화 후 경위도 보정
  const nLat = dLng / len;
  const nLng = -dLat / len;
  const metersPerDegLat = 111_320;
  const metersPerDegLng =
    111_320 * Math.cos((origin.lat * Math.PI) / 180);
  const dyLat = (offsetMeters / metersPerDegLat) * nLat;
  const dyLng = (offsetMeters / metersPerDegLng) * nLng;

  const path: LatLng[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // 중간으로 갈수록 오프셋이 커졌다 작아지는 반원형 곡선
    const bulge = Math.sin(Math.PI * t);
    path.push({
      lat: origin.lat + dLat * t + dyLat * bulge,
      lng: origin.lng + dLng * t + dyLng * bulge,
    });
  }
  return path;
}
