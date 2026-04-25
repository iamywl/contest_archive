"use client";

import { useEffect, useMemo, useState } from "react";
import type { Policy } from "@/lib/types";

type DayEntry = { date: string; dayLabel: string; items: Policy[] };

function daysUntil(deadline: string): number {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
}

export default function CalendarPage() {
  const [items, setItems] = useState<Policy[]>([]);
  useEffect(() => {
    fetch("/api/policies")
      .then((r) => r.json() as Promise<{ items: Policy[] }>)
      .then((d) => setItems(d.items ?? []));
  }, []);

  const grouped = useMemo<DayEntry[]>(() => {
    const buckets: Record<string, DayEntry> = {};
    for (const p of items) {
      const d = daysUntil(p.deadline);
      if (d < 0 || d > 60) continue;
      const key = p.deadline;
      if (!buckets[key]) {
        const weekDay = new Date(p.deadline).toLocaleDateString("ko-KR", { weekday: "short" });
        buckets[key] = { date: p.deadline, dayLabel: `${p.deadline} (${weekDay}) · D-${d}`, items: [] };
      }
      buckets[key].items.push(p);
    }
    return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
  }, [items]);

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="text-3xl font-bold">마감 캘린더</h1>
        <p className="text-sm text-slate-300">60일 이내 마감 정책을 날짜순으로 묶어 보여줍니다.</p>
      </header>
      {grouped.length === 0 && <p className="text-slate-400">60일 이내 마감 예정 정책이 없습니다.</p>}
      <ol className="flex flex-col gap-4">
        {grouped.map((g) => (
          <li key={g.date} className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold">{g.dayLabel}</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {g.items.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2 text-slate-200">
                  <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs font-semibold">{p.source}</span>
                  <span>{p.title}</span>
                  <span className="text-xs text-slate-400">· {p.category} · {p.region}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
