"use client";

import { useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Popup,
} from "react-leaflet";
import type { BikeStation, CourseRoute } from "@/lib/types";

const ROUTE_COLOR: Record<CourseRoute["id"], string> = {
  "3km": "#10b981",
  "5km": "#0ea5e9",
  "10km": "#6366f1",
};

type Props = {
  center: [number, number];
  routes: CourseRoute[];
  bikes: BikeStation[];
};

export function CourseMapClient({ center, routes, bikes }: Props) {
  const [selected, setSelected] = useState<CourseRoute["id"]>("5km");
  const active = useMemo(
    () => routes.find((r) => r.id === selected) ?? routes[1],
    [routes, selected],
  );

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label="코스 거리"
        className="flex gap-2 overflow-x-auto"
      >
        {routes.map((route) => {
          const on = route.id === selected;
          return (
            <button
              key={route.id}
              role="tab"
              aria-selected={on}
              onClick={() => setSelected(route.id)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                on
                  ? "border-emerald-600 bg-emerald-600 text-white shadow"
                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
              }`}
            >
              {route.label}
              <span className="ml-2 text-[10px] opacity-80">약 {route.estMinutes}분</span>
            </button>
          );
        })}
      </div>

      <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-slate-100">
        <MapContainer
          center={center}
          zoom={14}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {routes.map((route) => (
            <Polyline
              key={route.id}
              positions={route.polyline}
              pathOptions={{
                color: ROUTE_COLOR[route.id],
                weight: route.id === selected ? 6 : 2,
                opacity: route.id === selected ? 0.9 : 0.35,
                dashArray: route.id === selected ? undefined : "4 6",
              }}
            />
          ))}

          {bikes.map((b) => (
            <CircleMarker
              key={b.id}
              center={[b.lat, b.lng]}
              radius={7}
              pathOptions={{
                color: "#b45309",
                fillColor: "#f59e0b",
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Popup>
                <div className="space-y-0.5 text-xs">
                  <div className="font-semibold text-slate-800">{b.name}</div>
                  <div className="text-slate-500">{b.operator}</div>
                  <div>
                    자전거 <b>{b.availableBikes}</b> · 반납 <b>{b.availableDocks}</b> /{" "}
                    {b.totalDocks}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 text-sm text-slate-700">
        <div className="font-semibold text-slate-800">{active.label}</div>
        <p className="mt-0.5 text-xs text-slate-500">
          {active.distanceKm}km · 약 {active.estMinutes}분 · 반납소{" "}
          {bikes.length}곳 표시
        </p>
      </div>
    </div>
  );
}
