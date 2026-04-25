"use client";

/**
 * 유아 필터 — 기저귀교환대·수유실·유모차 등 토글 (제안서 §2.2 ③).
 */

import { useEffect, useMemo, useState } from "react";
import type { Poi } from "@/lib/types";

type Filter = {
  babyChange: boolean;
  kidsToilet: boolean;
  nursing: boolean;
  warmer: boolean;
  strollerOk: boolean;
  shade: boolean;
  playground: boolean;
  restroom: boolean;
  kidsRoom: boolean;
  accessible: boolean;
};

const DEFAULTS: Filter = {
  babyChange: true,
  kidsToilet: false,
  nursing: true,
  warmer: false,
  strollerOk: true,
  shade: false,
  playground: true,
  restroom: true,
  kidsRoom: false,
  accessible: false,
};

const LABELS: Record<keyof Filter, string> = {
  babyChange: "기저귀교환대",
  kidsToilet: "유아 좌변기",
  nursing: "수유실",
  warmer: "젖병 워머",
  strollerOk: "유모차 접근",
  shade: "그늘",
  playground: "놀이터",
  restroom: "화장실 있음",
  kidsRoom: "어린이 열람실",
  accessible: "장애인 접근",
};

export default function FilterPage() {
  const [items, setItems] = useState<Poi[]>([]);
  const [filter, setFilter] = useState<Filter>(DEFAULTS);

  useEffect(() => {
    fetch("/api/pois")
      .then((r) => r.json() as Promise<{ items: Poi[] }>)
      .then((d) => setItems(d.items ?? []));
  }, []);

  const filtered = useMemo(() => {
    return items.filter((p) => {
      const s = p.summary;
      if (filter.babyChange && !(s.includes("기저귀교환대") || s.includes("교환대"))) return false;
      if (filter.kidsToilet && !s.includes("유아좌변기")) return false;
      if (filter.nursing && !s.includes("수유실")) return false;
      if (filter.warmer && !s.includes("워머")) return false;
      if (filter.strollerOk && !s.includes("유모차")) return false;
      if (filter.shade && !s.includes("그늘")) return false;
      if (filter.playground && !s.includes("놀이터")) return false;
      if (filter.restroom && !s.includes("화장실")) return false;
      if (filter.kidsRoom && !s.includes("어린이실")) return false;
      if (filter.accessible && !s.includes("장애인")) return false;
      return true;
    });
  }, [items, filter]);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-5 py-8">
      <header>
        <h1 className="text-2xl font-bold text-emerald-800">유아 필터</h1>
        <p className="text-sm text-zinc-600">
          아이 연령·상황에 맞는 조건을 켜면 일치 POI 만 보여줍니다.
        </p>
      </header>

      <fieldset className="flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-white p-4">
        <legend className="px-1 text-xs font-semibold text-zinc-500">조건</legend>
        {(Object.keys(LABELS) as Array<keyof Filter>).map((k) => {
          const on = filter[k];
          return (
            <label
              key={k}
              className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${
                on
                  ? "border-emerald-500 bg-emerald-100 text-emerald-900"
                  : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                onChange={(e) => setFilter({ ...filter, [k]: e.target.checked })}
              />
              {LABELS[k]}
            </label>
          );
        })}
      </fieldset>

      <p className="text-sm text-zinc-600">
        <strong>{filtered.length}</strong>건 매칭 / 전체 {items.length}건
      </p>

      <ul className="flex flex-col gap-2">
        {filtered.map((p) => (
          <li key={p.id} className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
            <header className="flex items-center justify-between">
              <h3 className="font-semibold">{p.name}</h3>
              <span className="text-xs text-zinc-500">{p.kind}</span>
            </header>
            <p className="text-xs text-zinc-600">{p.address}</p>
            <p className="text-sm">{p.summary}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
