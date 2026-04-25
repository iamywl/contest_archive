"use client";

/**
 * 홈 — 내 매칭 (제안서 §2.2 ①).
 *
 * 프로파일 입력 → /api/matches → Top 20 카드 + 임박 배지.
 * 프로파일은 localStorage(`youth-profile`) 에 저장 — 서버 전송 없음.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ProfileForm } from "@/components/profile-form";
import { MatchList } from "@/components/policy-card";
import type { MatchScore, YouthProfile } from "@/lib/types";

const DEFAULT_PROFILE: YouthProfile = {
  age: 27,
  region: "서울",
  income: "mid",
  housing: "rent",
  employment: "job_seeker",
  interests: ["주거", "금융"],
};

const STORAGE_KEY = "youth-profile";

export default function HomePage() {
  const [profile, setProfile] = useState<YouthProfile>(DEFAULT_PROFILE);
  const [matches, setMatches] = useState<MatchScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(raw) });
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const persist = useCallback((next: YouthProfile) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const handleChange = useCallback(
    (next: YouthProfile) => {
      setProfile(next);
      persist(next);
    },
    [persist],
  );

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/matches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as { items: MatchScore[] };
      setMatches(data.items ?? []);
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const summary = useMemo(() => {
    if (!submitted) return null;
    const top = matches[0];
    const urgent = matches.find((m) => {
      const d = Math.ceil((new Date(m.policy.deadline).getTime() - Date.now()) / 86_400_000);
      return d <= 7 && d >= 0;
    });
    return { top, urgent };
  }, [submitted, matches]);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">청년원스톱 · 내 매칭</h1>
        <p className="text-sm text-slate-300">
          내 조건 한 번만 입력하면 <strong>온통청년 · 고용24 · LH · 서민금융진흥원 · HRD-Net</strong> 의
          청년 정책을 통합 매칭해 보여줍니다. 원값 소득·주민번호는 수집하지 않습니다.
        </p>
      </header>

      <ProfileForm value={profile} onChange={handleChange} onSubmit={handleSubmit} />

      {loading && <p className="text-slate-300">매칭 계산 중...</p>}
      {error && <p className="text-red-400">⚠️ {error}</p>}

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryBox
            label="가장 적합한 정책"
            title={summary.top?.policy.title ?? "해당 없음"}
            subtitle={summary.top ? `${(summary.top.score * 100).toFixed(0)}점 · ${summary.top.policy.source}` : ""}
          />
          <SummaryBox
            label="7일 내 마감 임박"
            title={summary.urgent?.policy.title ?? "없음"}
            subtitle={summary.urgent ? `D-${Math.ceil((new Date(summary.urgent.policy.deadline).getTime() - Date.now()) / 86_400_000)}` : "여유 있음"}
          />
        </div>
      )}

      {submitted && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">매칭 결과 ({matches.length}건)</h2>
          <MatchList matches={matches} />
        </section>
      )}
    </section>
  );
}

function SummaryBox({ label, title, subtitle }: { label: string; title: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">{title}</p>
      <p className="text-sm text-slate-400">{subtitle}</p>
    </div>
  );
}
