"use client";

/**
 * 나들이 일기 — localStorage 기반 체크인/기록 저장 (제안서 §2.2 ⑤).
 *
 * 위치 정보는 서버 전송 없이 클라이언트에만 저장된다 (CLAUDE.md §8 준수).
 */

import { useCallback, useEffect, useState } from "react";

type DiaryEntry = {
  id: string;
  date: string;
  destination: string;
  memo: string;
  rating: 1 | 2 | 3 | 4 | 5;
};

const STORAGE_KEY = "outing-diary";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [destination, setDestination] = useState("남산공원");
  const [memo, setMemo] = useState("");
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(4);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setEntries(JSON.parse(raw) as DiaryEntry[]);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: DiaryEntry[]) => {
    setEntries(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const add = useCallback(() => {
    if (!destination.trim()) return;
    const entry: DiaryEntry = {
      id: `${Date.now()}`,
      date: today(),
      destination: destination.trim(),
      memo: memo.trim(),
      rating,
    };
    persist([entry, ...entries]);
    setMemo("");
  }, [destination, memo, rating, entries, persist]);

  const remove = (id: string) => {
    persist(entries.filter((e) => e.id !== id));
  };

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-5 py-8">
      <header>
        <h1 className="text-2xl font-bold text-emerald-800">나들이 일기</h1>
        <p className="text-sm text-zinc-600">
          체크인 기록은 이 기기에만 저장됩니다. 서버로 전송되지 않습니다.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-white p-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">목적지</span>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">메모</span>
          <textarea
            rows={2}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
            placeholder="예: 오후 놀이터 만족, 다음엔 간식 준비"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="font-semibold">만족도</span>
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`rounded-full px-2 py-1 text-lg ${n <= rating ? "text-amber-500" : "text-zinc-300"}`}
              aria-label={`${n}점`}
            >
              ★
            </button>
          ))}
        </label>
        <button
          type="submit"
          className="w-fit rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          📔 일기 저장
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {entries.length === 0 && <p className="text-zinc-500">기록이 아직 없습니다.</p>}
        {entries.map((e) => (
          <li
            key={e.id}
            className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white px-4 py-3"
          >
            <header className="flex items-center justify-between">
              <h3 className="font-semibold">
                {e.destination}{" "}
                <span className="text-amber-500">{"★".repeat(e.rating)}</span>
              </h3>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <time>{e.date}</time>
                <button
                  type="button"
                  onClick={() => remove(e.id)}
                  className="rounded-md border border-zinc-200 px-2 py-0.5 text-zinc-400 hover:bg-zinc-100"
                >
                  삭제
                </button>
              </div>
            </header>
            {e.memo && <p className="text-sm text-zinc-700">{e.memo}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
