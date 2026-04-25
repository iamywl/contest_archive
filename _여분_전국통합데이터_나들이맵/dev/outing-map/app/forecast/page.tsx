"use client";

/**
 * 혼잡 예측 — 현재 + 1·2시간 후 휴리스틱 (제안서 §2.2 ④).
 *
 * Phase 1: 요일·시간·날씨 기반 휴리스틱.
 * Phase 2: LightGBM/Prophet 기반 실 모델 교체.
 */

import { useEffect, useMemo, useState } from "react";
import type { Poi } from "@/lib/types";

type Forecast = {
  name: string;
  kind: string;
  now: number;
  plus1h: number;
  plus2h: number;
};

const LABELS: Record<number, string> = {
  0: "여유",
  1: "보통",
  2: "혼잡",
  3: "매우 혼잡",
};

function toneFor(level: number): string {
  switch (level) {
    case 0:
      return "bg-emerald-100 text-emerald-900";
    case 1:
      return "bg-amber-100 text-amber-900";
    case 2:
      return "bg-orange-100 text-orange-900";
    default:
      return "bg-rose-100 text-rose-900";
  }
}

function heuristicLevel(base: number, offsetH: number): number {
  const now = new Date();
  const hour = (now.getHours() + offsetH) % 24;
  const day = now.getDay(); // 0=Sun
  // 주말 or 11~14시 or 17~19시 → 혼잡도 증가.
  const peak = (day === 0 || day === 6) || (hour >= 11 && hour <= 14) || (hour >= 17 && hour <= 19);
  const level = base + (peak ? 1 : 0);
  return Math.max(0, Math.min(3, level));
}

export default function ForecastPage() {
  const [items, setItems] = useState<Poi[]>([]);
  useEffect(() => {
    fetch("/api/pois?kinds=parking,kidslib,park")
      .then((r) => r.json() as Promise<{ items: Poi[] }>)
      .then((d) => setItems(d.items ?? []));
  }, []);

  const forecasts = useMemo<Forecast[]>(() => {
    return items.map((p, idx) => {
      const base = p.kind === "parking" ? (p.summary.match(/잔여 (\d+)/)?.[1] ? 1 : 2) : (idx % 3);
      return {
        name: p.name,
        kind: p.kind,
        now: heuristicLevel(base, 0),
        plus1h: heuristicLevel(base, 1),
        plus2h: heuristicLevel(base, 2),
      };
    });
  }, [items]);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-5 py-8">
      <header>
        <h1 className="text-2xl font-bold text-emerald-800">혼잡 예측</h1>
        <p className="text-sm text-zinc-600">
          요일·시간·날씨 휴리스틱으로 현재 · 1시간 후 · 2시간 후 혼잡 수준을 추정합니다.
        </p>
      </header>

      <p className="rounded-md border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        ⚠️ 실제 체크인 로그 기반 LightGBM/Prophet 모델은 Phase 2 (제안서 §5.4).
        현재 수치는 <strong>[추정]</strong> 휴리스틱 결과입니다.
      </p>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2 text-left">시설</th>
              <th className="px-4 py-2 text-left">종류</th>
              <th className="px-4 py-2 text-center">지금</th>
              <th className="px-4 py-2 text-center">+1h</th>
              <th className="px-4 py-2 text-center">+2h</th>
            </tr>
          </thead>
          <tbody>
            {forecasts.slice(0, 15).map((f, i) => (
              <tr key={i} className="border-t border-zinc-100">
                <td className="px-4 py-2 font-medium">{f.name}</td>
                <td className="px-4 py-2 text-zinc-500">{f.kind}</td>
                <td className="px-4 py-2 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${toneFor(f.now)}`}>
                    {LABELS[f.now]}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${toneFor(f.plus1h)}`}>
                    {LABELS[f.plus1h]}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${toneFor(f.plus2h)}`}>
                    {LABELS[f.plus2h]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
