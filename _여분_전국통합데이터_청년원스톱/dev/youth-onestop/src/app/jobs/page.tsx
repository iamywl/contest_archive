"use client";

import { useEffect, useState } from "react";
import type { JobPost } from "@/lib/types";

export default function JobsPage() {
  const [tab, setTab] = useState<"일자리" | "훈련">("일자리");
  const [items, setItems] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/jobs?category=${encodeURIComponent(tab)}`)
      .then((r) => r.json() as Promise<{ items: JobPost[] }>)
      .then((data) => setItems(data.items ?? []))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="text-3xl font-bold">일자리 · 훈련</h1>
        <p className="text-sm text-slate-300">고용24 · 워크넷 · HRD-Net 자료를 한 탭에서 전환하며 확인합니다.</p>
      </header>

      <div role="tablist" className="flex gap-2">
        {(["일자리", "훈련"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 text-sm font-semibold ${
              tab === t ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && <p>불러오는 중...</p>}

      <ul className="grid gap-4 md:grid-cols-2">
        {items.map((j) => (
          <li
            key={j.id}
            className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-900/60 p-5"
          >
            <header>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {j.source} · {j.region} · {j.category}
              </p>
              <h3 className="mt-1 text-lg font-semibold">{j.title}</h3>
              <p className="text-sm text-slate-300">{j.company}</p>
            </header>
            <p className="text-sm text-slate-300">{j.summary}</p>
            <dl className="grid grid-cols-2 gap-x-4 text-xs text-slate-400">
              <div>
                <dt className="font-semibold text-slate-500">마감</dt>
                <dd>{j.deadline}</dd>
              </div>
              {j.wage && (
                <div>
                  <dt className="font-semibold text-slate-500">처우</dt>
                  <dd>{j.wage}</dd>
                </div>
              )}
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}
