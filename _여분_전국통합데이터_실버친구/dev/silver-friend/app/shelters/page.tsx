"use client";

/**
 * 화면 ② — 가까운 쉼터·경로당 (제안서 §2.1 ②)
 *
 * 구성:
 *   - Leaflet 지도 (공용 `<Map>`) + 마커 (에어컨 🟢 / 난방 🟠)
 *   - 리스트 ↔ 지도 토글
 *   - 접근성 필터 (휠체어 가능 보기)
 */

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MapMarker } from "@/components/Map";
import type { Shelter, SheltersResponse } from "@/lib/types";

// 지도 자체가 "use client" 이지만 내부에서 ssr: false 인 react-leaflet 을 dynamic 로딩.
const Map = dynamic(() => import("@/components/Map"), { ssr: false });

const DEFAULT_COORDS: [number, number] = [37.5665, 126.978];

type ViewMode = "map" | "list";

export default function SheltersPage() {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [mode, setMode] = useState<ViewMode>("map");
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/shelters")
      .then((r) => r.json() as Promise<SheltersResponse>)
      .then((data) => {
        if (cancelled) return;
        setShelters(Array.isArray(data.items) ? data.items : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      accessibleOnly
        ? shelters.filter((s) => s.accessible)
        : shelters,
    [shelters, accessibleOnly],
  );

  const markers: MapMarker[] = useMemo(
    () =>
      filtered.map((s) => ({
        id: s.id,
        lat: s.lat,
        lng: s.lng,
        label: s.name,
        description: `${s.type} · ${s.operatingHours} · ${s.aircon ? "에어컨 🟢" : "난방 🟠"}`,
        // 에어컨(무더위쉼터) 🟢 ok / 난방(한파쉼터) 🟠 warn
        tone: s.aircon && s.type === "무더위쉼터" ? "ok" : "warn",
      })),
    [filtered],
  );

  const center: [number, number] = filtered[0]
    ? [filtered[0].lat, filtered[0].lng]
    : DEFAULT_COORDS;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="min-h-touch inline-flex items-center gap-2 rounded-[var(--radius-a11y-btn)] px-3 py-2 text-[var(--text-a11y-base)] font-semibold text-a11y-info hover:underline"
          aria-label="홈으로 이동"
        >
          ← 홈
        </Link>
        <h1 className="text-[var(--text-a11y-xl)] font-bold">주변 쉼터 지도</h1>
        <span aria-hidden className="w-16" />
      </header>

      <div
        role="tablist"
        aria-label="보기 방식"
        className="flex w-full rounded-[var(--radius-a11y-btn)] border-2 border-a11y-text/10 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "map"}
          onClick={() => setMode("map")}
          className={`min-h-touch flex-1 rounded-[var(--radius-a11y-btn)] text-[var(--text-a11y-lg)] font-bold transition-colors ${
            mode === "map"
              ? "bg-a11y-info text-white"
              : "text-a11y-text hover:bg-a11y-bg-alt"
          }`}
        >
          🗺️ 지도
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "list"}
          onClick={() => setMode("list")}
          className={`min-h-touch flex-1 rounded-[var(--radius-a11y-btn)] text-[var(--text-a11y-lg)] font-bold transition-colors ${
            mode === "list"
              ? "bg-a11y-info text-white"
              : "text-a11y-text hover:bg-a11y-bg-alt"
          }`}
        >
          📋 리스트
        </button>
      </div>

      <label className="inline-flex items-center gap-3 text-[var(--text-a11y-base)]">
        <input
          type="checkbox"
          className="h-6 w-6 accent-a11y-info"
          checked={accessibleOnly}
          onChange={(e) => setAccessibleOnly(e.target.checked)}
        />
        <span>♿ 휠체어 접근 가능한 곳만 보기</span>
      </label>

      <section aria-live="polite" className="flex flex-col gap-3">
        <p className="text-[var(--text-a11y-sm)] text-a11y-text-muted">
          총 <strong>{filtered.length}</strong>곳 · 🟢 에어컨 (무더위쉼터) · 🟠 난방
          (한파쉼터)
        </p>
      </section>

      {loading && (
        <p role="status" className="text-a11y-text-muted">
          불러오는 중...
        </p>
      )}
      {error && (
        <p role="alert" className="text-a11y-bad">
          데이터를 불러오지 못했어요: {error}
        </p>
      )}

      {!loading && mode === "map" && (
        <div className="overflow-hidden rounded-[var(--radius-a11y-card)] border-2 border-a11y-text/10">
          <Map center={center} zoom={12} markers={markers} height={480} />
        </div>
      )}

      {!loading && mode === "list" && (
        <ul className="flex flex-col gap-3">
          {filtered.map((s) => (
            <li
              key={s.id}
              className="rounded-[var(--radius-a11y-card)] border-2 border-a11y-text/10 bg-a11y-bg-alt p-5"
            >
              <h2 className="text-[var(--text-a11y-lg)] font-bold">
                {s.aircon ? "🟢 " : "🟠 "}
                {s.name}
                <span className="ml-2 rounded-full bg-a11y-info px-3 py-0.5 text-[var(--text-a11y-sm)] font-semibold text-white">
                  {s.type}
                </span>
              </h2>
              <p className="mt-1 text-[var(--text-a11y-base)]">{s.address}</p>
              <p className="mt-1 text-[var(--text-a11y-sm)] text-a11y-text-muted">
                {s.operatingHours} · 정원 {s.capacity}명 ·{" "}
                {s.accessible ? "♿ 휠체어 가능" : "♿ 확인 필요"}
              </p>
              {s.phone && (
                <a
                  href={`tel:${s.phone}`}
                  className="min-h-touch mt-3 inline-flex items-center gap-2 rounded-[var(--radius-a11y-btn)] bg-a11y-ok px-4 py-2 text-[var(--text-a11y-base)] font-bold text-white hover:brightness-110"
                >
                  📞 {s.phone}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
