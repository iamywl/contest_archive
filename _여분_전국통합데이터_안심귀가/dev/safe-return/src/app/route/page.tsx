"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { SafeMap } from "@/components/SafeMap";
import { ShakeSos } from "@/components/ShakeSos";
import {
  MOCK_CENTER,
  MOCK_DESTINATION,
  MOCK_ORIGIN,
} from "@/lib/mock-pois";
import type { Poi, RouteCandidate } from "@/lib/types";

type RouteResponse = {
  routes: RouteCandidate[];
  pois: Poi[];
};

function RouteInner() {
  const search = useSearchParams();
  const requestedId = search.get("id");

  const [routes, setRoutes] = useState<RouteCandidate[]>([]);
  const [pois, setPois] = useState<Poi[]>([]);
  const [activeId, setActiveId] = useState<string | null>(requestedId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: MOCK_ORIGIN,
            destination: MOCK_DESTINATION,
          }),
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as RouteResponse;
        if (cancelled) return;
        setRoutes(data.routes);
        setPois(data.pois);
        setActiveId((prev) => prev ?? data.routes[0]?.id ?? null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "경로 로드 실패");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const active = useMemo(
    () => routes.find((r) => r.id === activeId) ?? routes[0] ?? null,
    [routes, activeId],
  );

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-5">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <Link
            href="/"
            className="text-xs text-[var(--primary)] underline-offset-4 hover:underline"
          >
            ← 홈
          </Link>
          <h1 className="mt-1 text-xl font-bold">경로 지도</h1>
        </div>
        {active && (
          <div className="text-right text-sm">
            <p className="font-semibold">{active.label}</p>
            <p className="text-[var(--muted)]">
              {active.distanceMeters}m · {active.etaMinutes}분
            </p>
          </div>
        )}
      </header>

      {error && (
        <p className="mb-3 rounded-xl border border-[var(--bad)]/50 bg-[var(--bad)]/10 p-3 text-sm text-[var(--bad)]">
          {error}
        </p>
      )}

      <SafeMap
        center={[MOCK_CENTER.lat, MOCK_CENTER.lng]}
        zoom={16}
        height={420}
        routes={routes}
        activeRouteId={active?.id}
        pois={pois}
        origin={MOCK_ORIGIN}
        destination={MOCK_DESTINATION}
      />

      <section aria-label="경로 선택" className="mt-4 space-y-2">
        {routes.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setActiveId(r.id)}
            className={`w-full rounded-xl border p-3 text-left ${
              r.id === active?.id
                ? "border-[var(--primary)] bg-[var(--primary)]/10"
                : "border-[var(--border)] bg-[var(--card)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{r.label}</span>
              <span className="text-sm text-[var(--muted)]">
                S = {r.brightness.toFixed(2)} · {r.distanceMeters}m ·{" "}
                {r.etaMinutes}분
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">{r.summary}</p>
          </button>
        ))}
      </section>

      <section aria-label="범례" className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-xs text-[var(--muted)]">
        <p className="font-semibold text-[var(--foreground)]">마커 범례</p>
        <ul className="mt-1 grid grid-cols-2 gap-y-1">
          <li>🔵 공공 CCTV · 가로등</li>
          <li>🟢 24시 편의점</li>
          <li>🚨 지구대·파출소</li>
          <li>🛡 안심귀가 스카우트</li>
        </ul>
      </section>

      <div className="mt-5">
        <ShakeSos />
      </div>
    </main>
  );
}

export default function RoutePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-xl px-4 py-10 text-sm text-[var(--muted)]">
          지도 불러오는 중…
        </main>
      }
    >
      <RouteInner />
    </Suspense>
  );
}
