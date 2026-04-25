"use client";

/**
 * 러닝 크루 — 이벤트 생성/참여 (제안서 §2.2 ⑤).
 *
 * Phase 1: localStorage 기반 mock CRUD. Phase 2: 실제 백엔드 연동.
 */

import { useCallback, useEffect, useState } from "react";

type CrewEvent = {
  id: string;
  title: string;
  date: string;
  meetingAt: string;
  location: string;
  distanceKm: number;
  pace: string;
  capacity: number;
  attendees: string[];
};

const STORAGE_KEY = "runmate-crew";

const DEFAULT_EVENTS: CrewEvent[] = [
  {
    id: "evt-0",
    title: "한강 토요 5K 같이 뛰어요",
    date: new Date(Date.now() + 86_400_000 * 2).toISOString().slice(0, 10),
    meetingAt: "07:00",
    location: "뚝섬한강공원 자벌레",
    distanceKm: 5,
    pace: "6'00\"/km",
    capacity: 6,
    attendees: ["러너A", "러너B"],
  },
  {
    id: "evt-1",
    title: "성수 트레일 10K LSD",
    date: new Date(Date.now() + 86_400_000 * 5).toISOString().slice(0, 10),
    meetingAt: "06:30",
    location: "성수역 3번 출구",
    distanceKm: 10,
    pace: "5'30\"/km",
    capacity: 4,
    attendees: ["러너C"],
  },
];

export default function CrewPage() {
  const [events, setEvents] = useState<CrewEvent[]>(DEFAULT_EVENTS);
  const [me, setMe] = useState("러너L");
  const [form, setForm] = useState<CrewEvent>({
    id: "",
    title: "",
    date: new Date().toISOString().slice(0, 10),
    meetingAt: "06:30",
    location: "",
    distanceKm: 5,
    pace: "6'00\"/km",
    capacity: 6,
    attendees: [],
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setEvents(JSON.parse(raw) as CrewEvent[]);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: CrewEvent[]) => {
    setEvents(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const addEvent = useCallback(() => {
    if (!form.title.trim()) return;
    const entry: CrewEvent = { ...form, id: `evt-${Date.now()}`, attendees: [me] };
    persist([entry, ...events]);
    setForm({ ...form, title: "", location: "" });
  }, [form, events, persist, me]);

  const join = (id: string) => {
    persist(
      events.map((e) =>
        e.id === id && !e.attendees.includes(me) && e.attendees.length < e.capacity
          ? { ...e, attendees: [...e.attendees, me] }
          : e,
      ),
    );
  };

  const leave = (id: string) => {
    persist(events.map((e) => (e.id === id ? { ...e, attendees: e.attendees.filter((x) => x !== me) } : e)));
  };

  return (
    <section className="flex flex-col gap-5 py-8">
      <header>
        <h1 className="text-2xl font-bold">러닝 크루</h1>
        <p className="text-sm text-slate-600">
          이벤트는 이 기기에만 저장되는 mock 데이터입니다. 실제 크루 기능은 Phase 2.
        </p>
      </header>

      <label className="flex items-center gap-2 text-sm">
        <span className="font-semibold">내 닉네임</span>
        <input
          type="text"
          value={me}
          onChange={(e) => setMe(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1"
        />
      </label>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          addEvent();
        }}
        className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-3"
      >
        <label className="flex flex-col gap-1 sm:col-span-3">
          <span>제목</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2"
            placeholder="예: 한강 토요 5K"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>날짜</span>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>집결 시간</span>
          <input
            type="time"
            value={form.meetingAt}
            onChange={(e) => setForm({ ...form, meetingAt: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>장소</span>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>거리 (km)</span>
          <input
            type="number"
            step="0.5"
            value={form.distanceKm}
            onChange={(e) => setForm({ ...form, distanceKm: Number(e.target.value) })}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>페이스</span>
          <input
            type="text"
            value={form.pace}
            onChange={(e) => setForm({ ...form, pace: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>정원</span>
          <input
            type="number"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="col-span-2 mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white sm:col-span-3"
        >
          ➕ 이벤트 등록
        </button>
      </form>

      <ul className="flex flex-col gap-3">
        {events.map((e) => {
          const joined = e.attendees.includes(me);
          const full = e.attendees.length >= e.capacity;
          return (
            <li key={e.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
              <header className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold">{e.title}</h3>
                  <p className="text-xs text-slate-500">
                    {e.date} {e.meetingAt} · {e.location}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                  {e.attendees.length}/{e.capacity}
                </span>
              </header>
              <dl className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                <div>
                  <dt className="font-semibold">거리</dt>
                  <dd>{e.distanceKm} km</dd>
                </div>
                <div>
                  <dt className="font-semibold">페이스</dt>
                  <dd>{e.pace}</dd>
                </div>
                <div>
                  <dt className="font-semibold">참가자</dt>
                  <dd>{e.attendees.join(", ")}</dd>
                </div>
              </dl>
              <div className="mt-3 flex gap-2">
                {joined ? (
                  <button
                    type="button"
                    onClick={() => leave(e.id)}
                    className="rounded-md border border-rose-300 px-3 py-1 text-xs text-rose-700 hover:bg-rose-50"
                  >
                    참가 취소
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => join(e.id)}
                    disabled={full}
                    className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {full ? "정원 마감" : "참가하기"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
