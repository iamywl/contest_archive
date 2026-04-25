"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { LatLng, Poi, RouteCandidate } from "@/lib/types";

/**
 * 안심귀가 전용 Leaflet 지도 래퍼.
 *
 * `_여분_공유/components/Map.tsx` 의 개념을 본 프로젝트 요구(경로 폴리라인 + POI
 * 유형별 토너)에 맞게 확장한 버전. SSR 불가 → react-leaflet 전부 dynamic import.
 */

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false },
);
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), {
  ssr: false,
});
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), {
  ssr: false,
});
const Polyline = dynamic(
  () => import("react-leaflet").then((m) => m.Polyline),
  { ssr: false },
);

const TONE_COLOR = {
  ok: "#10b981",
  warn: "#f59e0b",
  bad: "#ef4444",
} as const;

const POI_LABEL = {
  cctv: "공공 CCTV",
  lamp: "가로등·보안등",
  cvs: "24시 편의점",
  station: "지구대·파출소",
  scout: "안심귀가 스카우트",
} as const;

type Props = {
  center: [number, number];
  zoom?: number;
  height?: number | string;
  routes?: RouteCandidate[];
  activeRouteId?: string;
  pois?: Poi[];
  origin?: LatLng;
  destination?: LatLng;
};

export function SafeMap({
  center,
  zoom = 15,
  height = 480,
  routes = [],
  activeRouteId,
  pois = [],
  origin,
  destination,
}: Props) {
  const style = useMemo(
    () => ({
      height: typeof height === "number" ? `${height}px` : height,
      width: "100%",
    }),
    [height],
  );

  return (
    <div
      className="overflow-hidden rounded-2xl border border-[var(--border)]"
      style={style}
      role="application"
      aria-label="안심귀가 지도"
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {routes.map((route) => (
          <Polyline
            key={route.id}
            positions={route.path.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{
              color: TONE_COLOR[route.tone],
              weight: route.id === activeRouteId ? 7 : 4,
              opacity: route.id === activeRouteId ? 0.95 : 0.55,
              dashArray: route.id === activeRouteId ? undefined : "8 6",
            }}
          />
        ))}

        {pois.map((poi) => (
          <Marker key={poi.id} position={[poi.lat, poi.lng]}>
            <Popup>
              <div>
                <strong>{POI_LABEL[poi.type]}</strong>
                {poi.name && (
                  <p style={{ margin: "4px 0 0" }}>{poi.name}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {origin && (
          <Marker position={[origin.lat, origin.lng]}>
            <Popup>출발지</Popup>
          </Marker>
        )}
        {destination && (
          <Marker position={[destination.lat, destination.lng]}>
            <Popup>도착지</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
