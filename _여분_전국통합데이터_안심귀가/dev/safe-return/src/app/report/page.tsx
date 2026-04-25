"use client";

/**
 * 리포트 — 귀가 이력·밝기 점수 요약 (제안서 §2.2 ⑤).
 *
 * 위치 로그는 기기에만 저장되며 서버 전송 없음 (CLAUDE.md §7).
 */

import { useEffect, useMemo, useState } from "react";

type HomeReturn = {
  id: string;
  date: string;
  origin: string;
  destination: string;
  brightnessAvg: number; // 0~100
  cctvCount: number;
  durationMin: number;
};

const STORAGE_KEY = "safe-return-log";

const SEED: HomeReturn[] = [
  {
    id: "hr-1",
    date: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10),
    origin: "강남역",
    destination: "논현동",
    brightnessAvg: 72,
    cctvCount: 18,
    durationMin: 22,
  },
  {
    id: "hr-2",
    date: new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10),
    origin: "사당역",
    destination: "방배동",
    brightnessAvg: 58,
    cctvCount: 11,
    durationMin: 28,
  },
  {
    id: "hr-3",
    date: new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10),
    origin: "건대입구역",
    destination: "자양동",
    brightnessAvg: 64,
    cctvCount: 14,
    durationMin: 19,
  },
];

function tone(score: number): string {
  if (score >= 70) return "bg-emerald-900/40 text-emerald-200 border-emerald-700";
  if (score >= 50) return "bg-amber-900/40 text-amber-200 border-amber-700";
  return "bg-rose-900/40 text-rose-200 border-rose-700";
}

export default function ReportPage() {
  const [items, setItems] = useState<HomeReturn[]>(SEED);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as HomeReturn[]);
    } catch {
      /* ignore */
    }
  }, []);

  const summary = useMemo(() => {
    if (items.length === 0) return null;
    const avg = items.reduce((s, r) => s + r.brightnessAvg, 0) / items.length;
    const cctv = items.reduce((s, r) => s + r.cctvCount, 0);
    const dur = items.reduce((s, r) => s + r.durationMin, 0);
    return { avg, cctv, dur };
  }, [items]);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-5 py-8">
      <header>
        <h1 className="text-2xl font-bold text-sky-300">귀가 리포트</h1>
        <p className="text-sm text-slate-400">
          기기에만 저장되는 귀가 이력입니다. 밝기 점수는 CCTV·가로등 밀도 기반 휴리스틱.
        </p>
      </header>

      {summary && (
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm">
          <div>
            <dt className="text-xs text-slate-500">평균 밝기 점수</dt>
            <dd className="text-xl font-semibold text-sky-300">{summary.avg.toFixed(0)} / 100</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">누적 CCTV 지점</dt>
            <dd className="text-xl font-semibold">{summary.cctv}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">총 귀가 시간</dt>
            <dd className="text-xl font-semibold">{summary.dur}분</dd>
          </div>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {items.map((r) => (
          <li
            key={r.id}
            className={`rounded-xl border px-4 py-3 text-sm ${tone(r.brightnessAvg)}`}
          >
            <header className="flex items-center justify-between">
              <h3 className="font-semibold">
                {r.date} · {r.origin} → {r.destination}
              </h3>
              <span className="text-xs">{r.durationMin}분</span>
            </header>
            <dl className="mt-1 flex gap-4 text-xs">
              <div>
                <dt className="opacity-70">밝기</dt>
                <dd>{r.brightnessAvg}</dd>
              </div>
              <div>
                <dt className="opacity-70">CCTV</dt>
                <dd>{r.cctvCount}개</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}
