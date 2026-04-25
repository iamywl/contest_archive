"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { DraftResponse, Policy, YouthProfile } from "@/lib/types";

const STORAGE_KEY = "youth-profile";

const DEFAULT_PROFILE: YouthProfile = {
  age: 27,
  region: "서울",
  income: "mid",
  housing: "rent",
  employment: "job_seeker",
  interests: ["주거", "금융"],
};

function DraftInner() {
  const params = useSearchParams();
  const preselectedId = params.get("policy");

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [policyId, setPolicyId] = useState<string>(preselectedId ?? "");
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<YouthProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    fetch("/api/policies")
      .then((r) => r.json() as Promise<{ items: Policy[] }>)
      .then((d) => setPolicies(d.items ?? []));
  }, []);

  useEffect(() => {
    if (!policyId && policies.length && !preselectedId) {
      setPolicyId(policies[0].id);
    }
  }, [policies, policyId, preselectedId]);

  const handleGenerate = useCallback(async () => {
    if (!policyId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile, policyId, extraNote: note }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as DraftResponse;
      setDraft(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [policyId, note, profile]);

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="text-3xl font-bold">AI 신청서 초안</h1>
        <p className="text-sm text-slate-300">
          로컬 Ollama LLM 이 가동 중이면 자연스러운 문장, 그렇지 않으면 템플릿 기반 초안이 생성됩니다.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleGenerate();
        }}
        className="flex flex-col gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-5"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">정책 선택</span>
          <select
            value={policyId}
            onChange={(e) => setPolicyId(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          >
            {policies.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.source}] {p.title} · D-{Math.ceil((new Date(p.deadline).getTime() - Date.now()) / 86_400_000)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">추가 메모 (선택)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="예: 현재 월세 55만원 거주, 이직 준비 중"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={loading || !policyId}
          className="w-fit rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "생성 중..." : "초안 생성"}
        </button>
      </form>

      {error && <p className="text-red-400">⚠️ {error}</p>}

      {draft && (
        <article className="flex flex-col gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-6">
          <header>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              백엔드: <strong>{draft.backend}</strong>
            </p>
            <h2 className="text-xl font-semibold">{draft.title}</h2>
          </header>
          {draft.warnings.length > 0 && (
            <ul className="rounded-md border border-amber-600/50 bg-amber-500/10 p-3 text-xs text-amber-200">
              {draft.warnings.map((w, i) => (
                <li key={i}>⚠️ {w}</li>
              ))}
            </ul>
          )}
          {draft.sections.map((s, i) => (
            <section key={i} className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold">{s.heading}</h3>
              <p className="whitespace-pre-wrap text-sm text-slate-200">{s.body}</p>
            </section>
          ))}
        </article>
      )}
    </section>
  );
}

export default function DraftPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl p-10">불러오는 중...</div>}>
      <DraftInner />
    </Suspense>
  );
}
