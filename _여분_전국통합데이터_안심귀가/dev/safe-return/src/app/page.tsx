"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ShakeSos } from "@/components/ShakeSos";
import {
  MOCK_DESTINATION,
  MOCK_DESTINATION_LABEL,
  MOCK_ORIGIN,
  MOCK_ORIGIN_LABEL,
} from "@/lib/mock-pois";
import type { RouteCandidate } from "@/lib/types";

type RouteResponse = {
  routes: RouteCandidate[];
};

export default function HomePage() {
  const router = useRouter();
  const [origin, setOrigin] = useState(MOCK_ORIGIN_LABEL);
  const [destination, setDestination] = useState(MOCK_DESTINATION_LABEL);
  const [routes, setRoutes] = useState<RouteCandidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 주소→좌표는 MVP 범위 외. mock 고정 좌표 사용.
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
      setRoutes(data.routes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "경로 계산 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-[var(--primary)]">
          Safe Return · MVP
        </p>
        <h1 className="mt-1 text-2xl font-bold">안심귀가</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          가장 짧은 길이 아니라, 가장 밝은 길로.
        </p>
      </header>

      <section
        aria-label="출발지·도착지 입력"
        className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
      >
        <label className="block text-sm text-[var(--muted)]">출발지</label>
        <input
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-base"
          placeholder="신림역 2번출구"
        />
        <label className="mt-3 block text-sm text-[var(--muted)]">도착지</label>
        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-base"
          placeholder="집 (신원초교 앞)"
        />
        <button
          type="button"
          onClick={fetchRoutes}
          disabled={loading}
          className="mt-3 w-full rounded-xl bg-[var(--primary)] py-3 font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
        >
          {loading ? "계산 중…" : "밝기 점수로 3경로 보기"}
        </button>
        <p className="mt-2 text-xs text-[var(--muted)]">
          MVP 데모: 신림역~신원초 mock 좌표로 고정 계산
        </p>
      </section>

      <section aria-label="후보 경로" className="mt-5 space-y-3">
        <h2 className="text-base font-semibold">밝기 점수 후보 3경로</h2>
        {error && (
          <p className="rounded-xl border border-[var(--bad)]/50 bg-[var(--bad)]/10 p-3 text-sm text-[var(--bad)]">
            경로를 불러오지 못했습니다: {error}
          </p>
        )}
        {!routes && !error && (
          <p className="text-sm text-[var(--muted)]">경로 계산 중…</p>
        )}
        {routes?.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => router.push(`/route?id=${r.id}`)}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-left transition hover:border-[var(--primary)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">{r.label}</span>
              <span className="text-sm text-[var(--muted)]">
                S = {r.brightness.toFixed(2)}
              </span>
            </div>
            <div className="mt-1 text-sm text-[var(--muted)]">
              약 {r.distanceMeters}m · 예상 도보 {r.etaMinutes}분
            </div>
            <div className="mt-2 text-sm">{r.summary}</div>
          </button>
        ))}
        <Link
          href="/route"
          className="block w-full rounded-xl border border-[var(--border)] py-3 text-center text-sm font-semibold text-[var(--primary)]"
        >
          경로 지도 열기 →
        </Link>
      </section>

      <section className="mt-6">
        <ShakeSos />
      </section>

      <footer className="mt-10 text-center text-xs text-[var(--muted)]">
        공공데이터 출처: 행정안전부·지자체(CCTV·가로등) / 경찰청(지구대) /
        여성가족부(안심귀가 스카우트). 본 화면은 MVP mock 데이터입니다.
      </footer>
    </main>
  );
}
