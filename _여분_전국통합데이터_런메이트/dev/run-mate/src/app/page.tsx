import Link from "next/link";
import { loadMock } from "@/lib/mock";
import { computeSignal } from "@/lib/signal";
import type { SignalResponse, SignalTone } from "@/lib/types";

export const dynamic = "force-dynamic";

const TONE_BG: Record<SignalTone, string> = {
  ok: "bg-emerald-50 border-emerald-200",
  warn: "bg-amber-50 border-amber-200",
  bad: "bg-rose-50 border-rose-200",
};
const TONE_TEXT: Record<SignalTone, string> = {
  ok: "text-emerald-700",
  warn: "text-amber-700",
  bad: "text-rose-700",
};
const TONE_CHIP: Record<SignalTone, string> = {
  ok: "bg-emerald-100 text-emerald-800",
  warn: "bg-amber-100 text-amber-800",
  bad: "bg-rose-100 text-rose-800",
};

async function loadSignal(): Promise<SignalResponse> {
  const [aq, weather] = await Promise.all([
    loadMock("air-quality.json"),
    loadMock("weather.json"),
  ]);
  return computeSignal(
    aq as Parameters<typeof computeSignal>[0],
    weather as Parameters<typeof computeSignal>[1],
  );
}

export default async function HomePage() {
  const signal = await loadSignal();

  return (
    <div className="space-y-6 pt-5">
      <section
        className={`rounded-2xl border p-6 shadow-sm ${TONE_BG[signal.tone]}`}
        aria-live="polite"
      >
        <div className="flex items-center gap-4">
          <div className="text-6xl leading-none" aria-hidden>
            {signal.emoji}
          </div>
          <div className="flex-1">
            <div className={`text-xl font-bold ${TONE_TEXT[signal.tone]}`}>
              {signal.headline}
            </div>
            <p className="mt-1 text-sm text-slate-700">{signal.reason}</p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-3 text-center text-xs text-slate-600">
          <div className="rounded-xl bg-white/70 p-2">
            <dt className="font-medium">CAI</dt>
            <dd className="mt-0.5 text-base font-bold text-slate-800">
              {signal.aq.cai}
              <span className="ml-1 text-[10px] text-slate-500">
                ({signal.aq.gradeLabel})
              </span>
            </dd>
          </div>
          <div className="rounded-xl bg-white/70 p-2">
            <dt className="font-medium">PM2.5</dt>
            <dd className="mt-0.5 text-base font-bold text-slate-800">
              {signal.aq.pm25}
              <span className="ml-1 text-[10px] text-slate-500">㎍/㎥</span>
            </dd>
          </div>
          <div className="rounded-xl bg-white/70 p-2">
            <dt className="font-medium">기온</dt>
            <dd className="mt-0.5 text-base font-bold text-slate-800">
              {signal.weather.tempC}
              <span className="ml-1 text-[10px] text-slate-500">°C</span>
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-[11px] text-slate-500">
          측정소 {signal.aq.stationName} · 하늘 {signal.weather.sky} · 습도 {signal.weather.humidity}%
          · 바람 {signal.weather.windMs}m/s
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold text-slate-800">추천 시간대</h2>
        <ul className="grid grid-cols-3 gap-3">
          {signal.slots.map((slot) => (
            <li
              key={slot.label}
              className="rounded-2xl border border-[var(--color-border)] bg-white p-4 text-center shadow-sm"
            >
              <div
                className={`mx-auto inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE_CHIP[slot.tone]}`}
              >
                {slot.label}
              </div>
              <div className="mt-2 text-sm font-bold text-slate-800">{slot.range}</div>
              <p className="mt-1 text-[11px] text-slate-500">{slot.reason}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl bg-gradient-to-br from-emerald-50 to-white p-4 text-xs text-slate-600 ring-1 ring-emerald-100">
        <div className="mb-1 text-sm font-semibold text-emerald-700">러닝 가능하다면</div>
        <p>
          공원·하천·둘레길 3/5/10km 루트를{" "}
          <Link href="/course" className="font-semibold text-emerald-700 underline">
            코스 지도
          </Link>
          에서 골라보세요. 공영자전거 반납소까지 함께 표시됩니다.
        </p>
      </section>

      <p className="text-center text-[10px] text-slate-400">
        데이터: 한국환경공단 에어코리아 / 기상청 API허브 · mock fallback · 신호등은 규칙 엔진
        기반(Phase 1)
      </p>
    </div>
  );
}
