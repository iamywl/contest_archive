/**
 * 공용 Leaflet + OSM 지도 컴포넌트.
 *
 * 실버친구·나들이맵·런메이트·안심귀가·휠체어맵이 공통 사용.
 * API 키 불필요. 심사 환경 안정성 확보.
 *
 * 사용 예:
 *   <Map
 *     center={[37.5665, 126.9780]}
 *     zoom={13}
 *     markers={[{ id: '1', lat: 37.5665, lng: 126.9780, label: '서울시청', tone: 'ok' }]}
 *     onMarkerClick={(m) => console.log(m)}
 *   />
 *
 * 의존성 (프로젝트에서 설치):
 *   pnpm add leaflet react-leaflet
 *   pnpm add -D @types/leaflet
 */

"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import "leaflet/dist/leaflet.css";

// react-leaflet 은 SSR 불가 → dynamic import 필수
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

export type MarkerTone = "ok" | "warn" | "bad" | "info";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  description?: string;
  tone?: MarkerTone;
  icon?: string;
};

export type MapProps = {
  center: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
  className?: string;
  height?: number | string;
};

const TONE_EMOJI: Record<MarkerTone, string> = {
  ok: "🟢",
  warn: "🟡",
  bad: "🔴",
  info: "🔵",
};

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export default function Map({
  center,
  zoom = 13,
  markers = [],
  onMarkerClick,
  className,
  height = 480,
}: MapProps) {
  const style = useMemo(
    () => ({ height: typeof height === "number" ? `${height}px` : height, width: "100%" }),
    [height],
  );

  return (
    <div className={className} style={style} role="application" aria-label="지도">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            eventHandlers={
              onMarkerClick
                ? { click: () => onMarkerClick(marker) }
                : undefined
            }
          >
            {(marker.label || marker.description) && (
              <Popup>
                <div className="map-popup">
                  {marker.label && (
                    <strong>
                      {marker.tone ? `${TONE_EMOJI[marker.tone]} ` : ""}
                      {marker.label}
                    </strong>
                  )}
                  {marker.description && <p>{marker.description}</p>}
                </div>
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
