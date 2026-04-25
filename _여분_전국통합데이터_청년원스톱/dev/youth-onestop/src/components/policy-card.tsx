import Link from "next/link";
import type { MatchScore, Policy } from "@/lib/types";

function daysUntil(deadline: string): number {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
}

function urgencyBadge(deadline: string): { label: string; tone: string } {
  const d = daysUntil(deadline);
  if (d < 0) return { label: "마감됨", tone: "bg-slate-600 text-slate-200" };
  if (d <= 7) return { label: `D-${d}`, tone: "bg-rose-500 text-white" };
  if (d <= 30) return { label: `D-${d}`, tone: "bg-amber-500 text-slate-900" };
  return { label: `D-${d}`, tone: "bg-emerald-500 text-white" };
}

export function PolicyCard({ policy, score, reasons }: { policy: Policy; score?: number; reasons?: string[] }) {
  const badge = urgencyBadge(policy.deadline);
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {policy.source} · {policy.category} · {policy.region}
          </p>
          <h3 className="mt-1 text-lg font-semibold">{policy.title}</h3>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${badge.tone}`}>{badge.label}</span>
      </header>
      <p className="text-sm text-slate-300">{policy.summary}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400">
        <div>
          <dt className="font-semibold text-slate-500">연령</dt>
          <dd>
            {policy.ageMin}~{policy.ageMax}세
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">소득</dt>
          <dd>{policy.incomeTier.join(" / ")}</dd>
        </div>
        <div className="col-span-2">
          <dt className="font-semibold text-slate-500">구비 서류</dt>
          <dd>{policy.documents.join(" · ")}</dd>
        </div>
      </dl>
      {score !== undefined && (
        <div className="flex items-center justify-between rounded-lg bg-slate-800/60 px-3 py-2 text-sm">
          <span>
            매칭 점수 <strong className="text-blue-300">{(score * 100).toFixed(0)}점</strong>
          </span>
          {reasons && reasons.length > 0 && (
            <span className="text-xs text-slate-400">{reasons.slice(0, 3).join(" · ")}</span>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href={`/draft?policy=${encodeURIComponent(policy.id)}`}
          className="rounded-md bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-500"
        >
          ✍️ 신청서 초안
        </Link>
        {policy.url && (
          <a
            href={policy.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-slate-600 px-3 py-1.5 text-slate-300 hover:bg-slate-800"
          >
            원문 보기 ↗
          </a>
        )}
      </div>
    </article>
  );
}

export function MatchList({ matches }: { matches: MatchScore[] }) {
  if (!matches.length) {
    return <p className="text-slate-400">매칭되는 정책이 없습니다. 조건을 다시 확인하세요.</p>;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {matches.slice(0, 20).map((m) => (
        <PolicyCard key={m.policy.id} policy={m.policy} score={m.score} reasons={m.reasons} />
      ))}
    </div>
  );
}
