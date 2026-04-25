/** Haversine 거리 (km). 소수점 2자리. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return Math.round(R * c * 100) / 100;
}

/** 주차장 가용률 → 3단계 색상 톤. */
export function parkingTone(available: number, capacity: number): "ok" | "warn" | "bad" {
  if (capacity <= 0) return "bad";
  const ratio = available / capacity;
  if (ratio >= 0.3) return "ok";
  if (ratio >= 0.1) return "warn";
  return "bad";
}
