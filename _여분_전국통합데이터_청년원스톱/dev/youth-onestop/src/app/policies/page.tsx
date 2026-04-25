"use client";

import { useEffect, useMemo, useState } from "react";
import { PolicyCard } from "@/components/policy-card";
import type { Policy, PolicyCategory } from "@/lib/types";

const CATEGORIES: (PolicyCategory | "전체")[] = ["전체", "주거", "금융", "취업", "창업", "교육", "복지"];

export default function PoliciesPage() {
  const [items, setItems] = useState<Policy[]>([]);
  const [category, setCategory] = useState<PolicyCategory | "전체">("전체");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const qs = category === "전체" ? "" : `?category=${category}`;
    fetch(`/api/policies${qs}`)
      .then((r) => r.json() as Promise<{ items: Policy[] }>)
      .then((data) => setItems(data.items ?? []))
      .finally(() => setLoading(false));
  }, [category]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()),
    [items],
  );

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="text-3xl font-bold">정책 탐색</h1>
        <p className="text-sm text-slate-300">카테고리별로 마감이 가까운 순서로 정렬해 보여줍니다.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              category === c
                ? "border-blue-500 bg-blue-600/20 text-blue-200"
                : "border-slate-700 text-slate-300 hover:bg-slate-800"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading && <p>불러오는 중...</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {sorted.map((p) => (
          <PolicyCard key={p.id} policy={p} />
        ))}
      </div>
    </section>
  );
}
