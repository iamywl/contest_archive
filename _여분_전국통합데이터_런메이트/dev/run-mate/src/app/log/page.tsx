"use client";

/**
 * 러닝 기록 — localStorage 기반 PR·세션 리스트 (제안서 §2.2 ④).
 */

import { useCallback, useEffect, useMemo, useState } from "react";

type RunLog = {
  id: string;
  date: string;
  distanceKm: number;
  durationMin: number;
  elevationM: number;
  note: string;
};

const STORAGE_KEY = "runmate-log";

function paceMinPerKm(d: number, mins: number): string {
  if (d <= 0) return "-";
  const minutes = mins / d;
  const m = Math.floor(minutes);
  const s = Math.round((minutes - m) * 60);
  return `${m}'${s.toString().padStart(2, "0")}"/km`;
}

export default function LogPage() {
  const [items, setItems] = useState<RunLog[]>([]);
  const [form, setForm] = useState<RunLog>({
    id: "",
    date: new Date().toISOString().slice(0, 10),
    distanceKm: 5,
    durationMin: 30,
    elevationM: 10,
    note: "",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as RunLog[]);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: RunLog[]) => {
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const add = useCallback(() => {
    const entry: RunLog = { ...form, id: `${Date.now()}` };
    persist([entry, ...items]);
    setForm({ ...form, note: "" });
  }, [form, items, persist]);

  const summary = useMemo(() => {
    if (items.length === 0) return null;
    const totalKm = items.reduce((s, r) => s + r.distanceKm, 0);
    const totalMin = items.reduce((s, r) => s + r.durationMin, 0);
    const longest = items.reduce((prev, cur) => (cur.distanceKm > prev.distanceKm ? cur : prev), items[0]);
    return { totalKm, totalMin, longest };
  }, [items]);

  return (
    <section className="flex flex-col gap-5 py-8">
      <header>
        <h1 className="text-2xl font-bold">러닝 기록</h1>
        <p className="text-sm text-slate-600">
          GPS 트래킹 대신 직접 입력 폼으로 기록. 기기에만 저장되며 서버로 전송되지 않습니다.
        </p>
      </header>

      {summary && (
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
          <div>
            <dt className="text-xs text-slate-500">누적 거리</dt>
            <dd className="text-lg font-semibold">{summary.totalKm.toFixed(1)} km</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">누적 시간</dt>
            <dd className="text-lg font-semibold">{Math.round(summary.totalMin)} 분</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">최장 거리</dt>
            <dd className="text-lg font-semibold">{summary.longest.distanceKm} km</dd>
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-4"
      >
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span>날짜</span>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>거리 (km)</span>
          <input
            type="number"
            step="0.1"
            value={form.distanceKm}
            onChange={(e) => setForm({ ...form, distanceKm: Number(e.target.value) })}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>시간 (분)</span>
          <input
            type="number"
            value={form.durationMin}
            onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-4">
          <span>메모</span>
          <input
            type="text"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2"
            placeholder="컨디션·코스 등"
          />
        </label>
        <button
          type="submit"
          className="col-span-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white sm:col-span-4"
        >
          ➕ 기록 추가
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {items.map((r) => (
          <li key={r.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
            <header className="flex items-center justify-between">
              <h3 className="font-semibold">
                {r.date} · {r.distanceKm}km / {r.durationMin}분
              </h3>
              <span className="text-xs text-slate-500">{paceMinPerKm(r.distanceKm, r.durationMin)}</span>
            </header>
            {r.note && <p className="text-slate-600">{r.note}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
