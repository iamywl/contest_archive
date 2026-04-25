"use client";

/**
 * 홈 — "오늘 나들이" (제안서 §2.2 ①).
 *
 * 목적지 입력 → /api/plan → 5단계 동선 카드.
 */

import { useCallback, useState } from "react";
import Link from "next/link";
import type { PlanRequest, PlanResult } from "@/lib/types";

const STAGE_COLORS: Record<string, string> = {
  주차: "bg-amber-100 text-amber-900 border-amber-300",
  화장실: "bg-sky-100 text-sky-900 border-sky-300",
  수유실: "bg-pink-100 text-pink-900 border-pink-300",
  공원: "bg-emerald-100 text-emerald-900 border-emerald-300",
  복귀: "bg-zinc-100 text-zinc-900 border-zinc-300",
};

const STAGE_EMOJI: Record<string, string> = {
  주차: "🅿️",
  화장실: "🚻",
  수유실: "🍼",
  공원: "🎪",
  복귀: "🏠",
};

export default function Home() {
  const [destination, setDestination] = useState("남산공원");
  const [kidAge, setKidAge] = useState<"baby" | "toddler" | "preschool">("toddler");
  const [babyFriendly, setBabyFriendly] = useState(true);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body: PlanRequest = { destination, kidAge, babyFriendly };
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { plan: PlanResult };
      setPlan(data.plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [destination, kidAge, babyFriendly]);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-emerald-800">오늘 나들이</h1>
        <p className="text-sm text-zinc-600">
          주차·화장실·수유실·공원을 한 번에 묶어 5단계 동선을 만들어 드립니다.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-zinc-700">목적지</span>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="예: 서울숲, 북서울꿈의숲, 하남 미사경정공원"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-zinc-700">아이 연령대</span>
          <select
            value={kidAge}
            onChange={(e) => setKidAge(e.target.value as typeof kidAge)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2"
          >
            <option value="baby">영아 (0~1세)</option>
            <option value="toddler">유아 (2~4세)</option>
            <option value="preschool">취학전 (5~7세)</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={babyFriendly}
            onChange={(e) => setBabyFriendly(e.target.checked)}
            className="h-5 w-5"
          />
          <span>기저귀교환대·수유실·유모차 동선 우선 적용</span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? "동선 생성 중..." : "🗺️ 5단계 동선 만들기"}
        </button>
      </form>

      {error && <p className="text-red-600">⚠️ {error}</p>}

      {plan && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-sm">
            <span>
              🌤️ <strong>{plan.weather}</strong> · 총 소요 <strong>{plan.totalEtaMinutes}분</strong>
            </span>
            <span className="text-xs text-emerald-700">
              {plan.babyFriendly ? "유아 친화 동선" : "기본 동선"}
            </span>
          </div>

          <ol className="flex flex-col gap-3">
            {plan.steps.map((s) => {
              const tone = STAGE_COLORS[s.stage] ?? STAGE_COLORS["복귀"];
              return (
                <li
                  key={s.step}
                  className={`flex flex-col gap-1 rounded-xl border px-4 py-3 ${tone}`}
                >
                  <header className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">
                      {STAGE_EMOJI[s.stage]} {s.step}. {s.stage} · {s.name}
                    </h3>
                    <span className="text-xs font-semibold">⏱ {s.etaMinutes}분</span>
                  </header>
                  <p className="text-xs opacity-80">{s.address}</p>
                  <p className="text-sm">{s.reason}</p>
                </li>
              );
            })}
          </ol>

          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/map"
              className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
            >
              🗺️ 지도로 보기
            </Link>
            <Link
              href="/diary"
              className="rounded-lg border border-emerald-600 px-4 py-2 font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              📔 나들이 일기로 저장
            </Link>
          </div>
        </section>
      )}
    </section>
  );
}
