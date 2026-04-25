"use client";

/**
 * 긴급 모드 — 3초 카운트다운 후 `tel:112` 딥링크 (제안서 §2.2 ④ · CLAUDE.md §7).
 *
 * 자치경찰 API 미승인 전제: REST 호출 위장 금지, tel 딥링크만.
 * 흔들기 단독 트리거 금지: 명시적 버튼 + 카운트다운 + 해제 버튼.
 */

import { useCallback, useEffect, useRef, useState } from "react";

type Triage = {
  severity: "low" | "mid" | "high";
  message: string;
};

function triageFromInput(note: string): Triage {
  const p = note.toLowerCase();
  if (p.includes("쫓") || p.includes("스토킹") || p.includes("흉기") || p.includes("폭행")) {
    return { severity: "high", message: "즉시 112 연결 + 보호자 알림 권장" };
  }
  if (p.includes("낯선") || p.includes("무섭") || p.includes("뒤따")) {
    return { severity: "mid", message: "가까운 지구대·편의점으로 이동 후 112" };
  }
  return { severity: "low", message: "보호자 공유 링크 전송 권장" };
}

export default function SosPage() {
  const [armed, setArmed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(3);
  const [note, setNote] = useState("");
  const [triage, setTriage] = useState<Triage | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const arm = useCallback(() => {
    setArmed(true);
    setSecondsLeft(3);
    clear();
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clear();
          if (typeof window !== "undefined") window.location.href = "tel:112";
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  const cancel = useCallback(() => {
    clear();
    setArmed(false);
    setSecondsLeft(3);
  }, []);

  useEffect(() => () => clear(), []);

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 py-8">
      <header>
        <h1 className="text-2xl font-bold text-rose-300">긴급 모드</h1>
        <p className="text-sm text-slate-300">
          버튼을 누르면 <strong>3초 카운트다운</strong> 후 <code>tel:112</code> 딥링크로 연결합니다.
          카운트다운 중 해제 가능합니다.
        </p>
      </header>

      {!armed ? (
        <button
          type="button"
          onClick={arm}
          className="w-full rounded-2xl bg-rose-600 px-6 py-6 text-2xl font-bold text-white shadow-lg shadow-rose-900/40 hover:bg-rose-500"
        >
          🚨 112 연결 시작 (3초 후)
        </button>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-rose-700 bg-rose-900/30 px-6 py-8">
          <p className="text-5xl font-bold text-rose-200">{secondsLeft}</p>
          <p className="text-sm text-rose-200">카운트다운이 끝나면 112 로 전화를 겁니다.</p>
          <button
            type="button"
            onClick={cancel}
            className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-rose-700 shadow"
          >
            ✋ 해제
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTriage(triageFromInput(note));
        }}
        className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm"
      >
        <label className="flex flex-col gap-1">
          <span className="text-slate-300">상황 요약 (로컬 분류)</span>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            placeholder="예: 누가 뒤따라오는 것 같아요"
          />
        </label>
        <button
          type="submit"
          className="w-fit rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
        >
          🔍 긴급도 분류
        </button>
      </form>

      {triage && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            triage.severity === "high"
              ? "border-rose-500 bg-rose-900/40 text-rose-100"
              : triage.severity === "mid"
                ? "border-amber-500 bg-amber-900/30 text-amber-100"
                : "border-emerald-500 bg-emerald-900/30 text-emerald-100"
          }`}
        >
          <p className="font-semibold">심각도: {triage.severity.toUpperCase()}</p>
          <p className="mt-1">{triage.message}</p>
          <p className="mt-2 text-xs opacity-80">
            ℹ️ 분류는 로컬 규칙 기반. 실제 LLM 분류는 `/api/triage` + Ollama `small` 로 확장.
          </p>
        </div>
      )}
    </section>
  );
}
