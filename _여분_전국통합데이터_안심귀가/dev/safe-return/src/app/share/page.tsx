"use client";

/**
 * 보호자 공유 — 만료 토큰형 공유 링크 생성 (제안서 §2.2 ③).
 *
 * 보호자 번호는 해시로만 노출하고 서버에 영구 저장하지 않는다 (CLAUDE.md §7).
 */

import { useCallback, useMemo, useState } from "react";

function hashPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

function randomToken(len = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function SharePage() {
  const [guardianName, setGuardianName] = useState("엄마");
  const [guardianPhone, setGuardianPhone] = useState("010-0000-0000");
  const [durationMin, setDurationMin] = useState(30);
  const [token, setToken] = useState<string | null>(null);
  const [issuedAt, setIssuedAt] = useState<string | null>(null);

  const issue = useCallback(() => {
    const t = randomToken();
    setToken(t);
    setIssuedAt(new Date().toISOString());
  }, []);

  const shareLink = useMemo(() => {
    if (!token) return null;
    return `${typeof window !== "undefined" ? window.location.origin : ""}/share/${token}`;
  }, [token]);

  const expiresAt = useMemo(() => {
    if (!issuedAt) return null;
    return new Date(new Date(issuedAt).getTime() + durationMin * 60_000).toLocaleTimeString("ko-KR");
  }, [issuedAt, durationMin]);

  const smsHref = shareLink
    ? `sms:${guardianPhone.replace(/\D/g, "")}?body=${encodeURIComponent(
        `[안심귀가] ${durationMin}분간 실시간 위치 공유: ${shareLink}`,
      )}`
    : "#";

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-8">
      <header>
        <h1 className="text-2xl font-bold">보호자 공유 링크</h1>
        <p className="text-sm text-slate-400">
          만료 시간 이후 자동 소멸하는 일회용 토큰을 발급합니다. 보호자 번호는 해시 표기만 저장됩니다.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          issue();
        }}
        className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">보호자 이름</span>
          <input
            type="text"
            value={guardianName}
            onChange={(e) => setGuardianName(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">보호자 휴대폰</span>
          <input
            type="tel"
            value={guardianPhone}
            onChange={(e) => setGuardianPhone(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          />
          <span className="text-xs text-slate-500">저장 값: {hashPhone(guardianPhone)}</span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">유효 시간 (분)</span>
          <input
            type="number"
            min={5}
            max={180}
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="w-fit rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
        >
          🔗 공유 링크 발급
        </button>
      </form>

      {token && (
        <article className="rounded-xl border border-sky-700 bg-sky-900/30 p-4 text-sm">
          <p className="text-xs text-sky-300">
            {guardianName} 보호자에게 전송 · 만료 {expiresAt}
          </p>
          <p className="mt-1 break-all font-mono text-sm">{shareLink}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={smsHref}
              className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
            >
              📩 SMS 전송
            </a>
            <button
              type="button"
              onClick={() => shareLink && navigator.clipboard?.writeText(shareLink)}
              className="rounded-md border border-sky-500 px-3 py-1.5 text-xs text-sky-200 hover:bg-sky-800"
            >
              📋 링크 복사
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            ⚠️ 실 서비스에서는 JWT + iat/exp 검증을 서버에 두고 본 화면은 토큰 발급만 담당합니다.
          </p>
        </article>
      )}
    </section>
  );
}
