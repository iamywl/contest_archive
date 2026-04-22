import { loadMock } from "@/lib/mock";
import { CourseMapClient } from "@/components/course-map-client";
import type { BikesResponse, CourseRoute } from "@/lib/types";

export const dynamic = "force-dynamic";

// 서울 광화문 인근 샘플 좌표. 실제 운영 시 Geolocation → OSRM 호출로 치환.
const CENTER: [number, number] = [37.5744, 126.979];

function circleRoute(
  center: [number, number],
  radiusKm: number,
  points = 32,
): [number, number][] {
  const coords: [number, number][] = [];
  const R = 6371;
  const latRad = (center[0] * Math.PI) / 180;
  for (let i = 0; i <= points; i += 1) {
    const theta = (i / points) * Math.PI * 2;
    const dLat = (radiusKm / R) * Math.cos(theta) * (180 / Math.PI);
    const dLng =
      ((radiusKm / R) * Math.sin(theta) * (180 / Math.PI)) / Math.cos(latRad);
    coords.push([center[0] + dLat, center[1] + dLng]);
  }
  return coords;
}

// 반경 기반 단순 루프. 심사 데모용 — 실제로는 OSRM /route 로 대체.
function buildRoutes(center: [number, number]): CourseRoute[] {
  return [
    {
      id: "3km",
      label: "3km 산책",
      distanceKm: 3,
      estMinutes: 18,
      tone: "ok",
      polyline: circleRoute(center, 0.48),
    },
    {
      id: "5km",
      label: "5km 러닝",
      distanceKm: 5,
      estMinutes: 30,
      tone: "ok",
      polyline: circleRoute(center, 0.8),
    },
    {
      id: "10km",
      label: "10km 롱런",
      distanceKm: 10,
      estMinutes: 60,
      tone: "warn",
      polyline: circleRoute(center, 1.6),
    },
  ];
}

export default async function CoursePage() {
  const bikes = await loadMock<BikesResponse>("bikes.json");
  const routes = buildRoutes(CENTER);

  return (
    <div className="space-y-4 pt-5">
      <section>
        <h1 className="text-xl font-bold text-slate-800">코스 지도</h1>
        <p className="mt-1 text-sm text-slate-600">
          3km / 5km / 10km 루프 루트 + 공영자전거 반납소. 러닝 후 반납 가능한 곳을 함께 표시합니다.
        </p>
      </section>

      <CourseMapClient center={CENTER} routes={routes} bikes={bikes.items} />

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-4 text-xs text-slate-500">
        <div className="mb-2 font-semibold text-slate-700">표시 범례</div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <li className="flex items-center gap-2">
            <span className="h-2 w-6 rounded bg-emerald-500" /> 3km
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2 w-6 rounded bg-sky-500" /> 5km
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2 w-6 rounded bg-indigo-500" /> 10km
          </li>
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-500" /> 자전거 반납소
          </li>
        </ul>
        <p className="mt-3 text-[11px] text-slate-400">
          ※ 루트는 단순 반경 원형 폴리라인입니다. 운영 단계에서는 OSRM 라우팅으로
          공원·하천길을 따라 실제 경로를 계산합니다.
        </p>
      </section>
    </div>
  );
}
