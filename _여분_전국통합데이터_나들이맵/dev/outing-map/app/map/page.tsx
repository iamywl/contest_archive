"use client";

/**
 * 지도 — 반경 2km POI 통합 표시 (제안서 §2.2 ②).
 *
 * 현재 PoC 단계에서는 Leaflet 풀 스택이 아직 도입되지 않았으므로
 * POI 리스트 + 좌표 카드뷰로 대체한다. Phase 2 에서 `_여분_공유/components/Map.tsx` 통합.
 */

import { useEffect, useMemo, useState } from "react";
import type { Poi, PoiKind } from "@/lib/types";

const KIND_LABELS: Record<PoiKind, { label: string; icon: string; tone: string }> = {
  parking: { label: "주차장", icon: "🅿️", tone: "bg-amber-100 border-amber-300" },
  toilet: { label: "화장실", icon: "🚻", tone: "bg-sky-100 border-sky-300" },
  nursing: { label: "수유실", icon: "🍼", tone: "bg-pink-100 border-pink-300" },
  kidslib: { label: "어린이도서관", icon: "📚", tone: "bg-violet-100 border-violet-300" },
  park: { label: "공원", icon: "🎪", tone: "bg-emerald-100 border-emerald-300" },
};

const KINDS: PoiKind[] = ["parking", "toilet", "nursing", "kidslib", "park"];

export default function MapPage() {
  const [items, setItems] = useState<Poi[]>([]);
  const [active, setActive] = useState<Set<PoiKind>>(new Set(KINDS));

  useEffect(() => {
    fetch("/api/pois")
      .then((r) => r.json() as Promise<{ items: Poi[] }>)
      .then((d) => setItems(d.items ?? []));
  }, []);

  const filtered = useMemo(
    () => items.filter((p) => active.has(p.kind)),
    [items, active],
  );

  const toggle = (k: PoiKind) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-5 py-8">
      <header>
        <h1 className="text-2xl font-bold text-emerald-800">통합 POI 지도</h1>
        <p className="text-sm text-zinc-600">
          공공 API 키 없이 mock 데이터로 5종 POI를 한 번에 표시합니다.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => {
          const meta = KIND_LABELS[k];
          const on = active.has(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggle(k)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                on ? meta.tone + " text-zinc-900" : "border-zinc-200 bg-white text-zinc-400"
              }`}
            >
              {meta.icon} {meta.label} ({items.filter((i) => i.kind === k).length})
            </button>
          );
        })}
      </div>

      <p className="rounded-md border border-dashed border-zinc-300 bg-white/60 px-4 py-3 text-xs text-zinc-500">
        ※ Leaflet 기반 실제 지도는 Phase 2 에서 <code>@shared/components/Map.tsx</code> 로 통합. 본 PoC 는 좌표 카드 뷰.
      </p>

      <ul className="grid gap-3 sm:grid-cols-2">
        {filtered.map((p) => {
          const meta = KIND_LABELS[p.kind];
          return (
            <li
              key={p.id}
              className={`flex flex-col gap-1 rounded-xl border px-4 py-3 ${meta.tone}`}
            >
              <header className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {meta.icon} {p.name}
                </h3>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs">
                  {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                </span>
              </header>
              <p className="text-xs opacity-80">{p.address}</p>
              <p className="text-sm">{p.summary}</p>
              {p.babyFriendly && (
                <span className="mt-1 w-fit rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  👶 유아 친화
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {filtered.length === 0 && (
        <p className="text-zinc-500">선택된 카테고리가 없어요. 위 토글을 켜 주세요.</p>
      )}
    </section>
  );
}
