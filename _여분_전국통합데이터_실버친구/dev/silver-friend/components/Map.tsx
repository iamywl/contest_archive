"use client";

/**
 * Leaflet 지도 컴포넌트 (실버친구 로컬판).
 *
 * 공용 컴포넌트 사양은 `_여분_공유/components/Map.tsx` 가 진실 출처이며,
 * 본 파일은 동일 인터페이스(Props/MarkerTone)를 Turbopack 이 node_modules
 * 해석 가능한 위치에서 구현한다. 공용 사양이 바뀌면 본 파일도 동기화한다.
 *
 * `@shared/*` 경로 별칭은 `tsconfig.json` 에 구성되어 있어
 * `public-api-proxy` / `local-llm` 같은 외부 의존성이 없는 리소스는
 * 직접 참조 가능하다.
 */

import dynamic from "next/dynamic";
import { useMemo } from "react";
import "leaflet/dist/leaflet.css";

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
    () => ({
      height: typeof height === "number" ? `${height}px` : height,
      width: "100%",
    }),
    [height],
  );

  return (
    <div
      className={className}
      style={style}
      role="application"
      aria-label="지도"
    >
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
