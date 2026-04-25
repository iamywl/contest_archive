"use client";

/**
 * AI 코스 빌더 — 자연어 입력 → 규칙/LLM Tool-use 로 코스 JSON (제안서 §2.2 ③).
 *
 * 로컬 Ollama(`qwen2.5:32b`) 미가동 시 키워드 기반 규칙 폴백.
 */

import { useCallback, useState } from "react";

type Route = {
  name: string;
  distanceKm: number;
  elevationGainM: number;
  surface: "asphalt" | "trail";
  summary: string;
};

type BuildResponse = {
  backend: "rules" | "ollama";
  prompt: string;
  routes: Route[];
};

const DEFAULT_PRESETS = [
  "한강 평지 5km, 강변 뷰",
  "남산 언덕 3km, 야경",
  "올림픽공원 유모차 동반 4km",
  "성수 트레일 10km, 장거리 LSD",
];

function ruleBased(prompt: string): Route[] {
  const p = prompt.toLowerCase();
  const routes: Route[] = [];
  const base = [
    { name: "한강 여의도 루프", distanceKm: 5, elevationGainM: 8, surface: "asphalt" as const, summary: "평지·강변 뷰" },
    { name: "남산 북측 순환", distanceKm: 3, elevationGainM: 120, surface: "asphalt" as const, summary: "언덕·야경" },
    { name: "올림픽공원 몽촌토성 코스", distanceKm: 4, elevationGainM: 20, surface: "asphalt" as const, summary: "유모차 OK" },
    { name: "양재천 장거리", distanceKm: 10, elevationGainM: 15, surface: "asphalt" as const, summary: "장거리 LSD" },
    { name: "북한산 둘레길 섹션", distanceKm: 6, elevationGainM: 220, surface: "trail" as const, summary: "트레일·그늘" },
  ];
  for (const r of base) {
    let match = 0;
    if (p.includes("평지") && r.elevationGainM < 30) match++;
    if (p.includes("언덕") && r.elevationGainM > 100) match++;
    if (p.includes("유모차") && r.summary.includes("유모차")) match += 2;
    if (p.includes("트레일") && r.surface === "trail") match++;
    if (p.includes("장거리") && r.distanceKm >= 10) match++;
    if (p.includes("한강") && r.name.includes("한강")) match += 2;
    if (p.includes("남산") && r.name.includes("남산")) match += 2;
    if (p.includes("야경") && r.summary.includes("야경")) match += 2;
    if (match > 0) routes.push({ ...r, summary: `${r.summary} · 매칭도 ${match}` });
  }
  if (routes.length === 0) routes.push(base[0]);
  return routes.slice(0, 3);
}

export default function BuilderPage() {
  const [prompt, setPrompt] = useState("한강 평지 5km, 강변 뷰");
  const [result, setResult] = useState<BuildResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 200));
      setResult({ backend: "rules", prompt, routes: ruleBased(prompt) });
    } finally {
      setLoading(false);
    }
  }, [prompt]);

  return (
    <section className="flex flex-col gap-5 py-8">
      <header>
        <h1 className="text-2xl font-bold">AI 코스 빌더</h1>
        <p className="text-sm text-slate-600">
          자연어로 원하는 코스를 말하면 3개 후보를 제시합니다. 로컬 LLM 부재 시 규칙 기반 폴백.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">원하는 러닝</span>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2"
            placeholder="예: 한강 평지 5km, 강변 뷰"
          />
        </label>

        <div className="flex flex-wrap gap-2 text-xs">
          {DEFAULT_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPrompt(p)}
              className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 hover:bg-slate-100"
            >
              {p}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-fit rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "생성 중..." : "🏃 코스 추천 받기"}
        </button>
      </form>

      {result && (
        <section className="flex flex-col gap-3">
          <p className="text-xs text-slate-500">
            backend: <strong>{result.backend}</strong> · prompt: {result.prompt}
          </p>
          {result.routes.map((r, i) => (
            <article
              key={i}
              className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-4 py-3"
            >
              <h3 className="text-base font-semibold">{r.name}</h3>
              <dl className="mt-1 grid grid-cols-3 gap-2 text-xs text-slate-600">
                <div>
                  <dt className="font-semibold">거리</dt>
                  <dd>{r.distanceKm} km</dd>
                </div>
                <div>
                  <dt className="font-semibold">누적 고도</dt>
                  <dd>{r.elevationGainM} m</dd>
                </div>
                <div>
                  <dt className="font-semibold">노면</dt>
                  <dd>{r.surface}</dd>
                </div>
              </dl>
              <p className="mt-1 text-sm">{r.summary}</p>
            </article>
          ))}
        </section>
      )}
    </section>
  );
}
