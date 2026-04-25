import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "청년원스톱 — 온통청년·고용24·LH·금융 통합 매칭",
  description:
    "내 조건 한번만 입력하면 주거·일자리·창업·금융 5개 기관의 청년 정책을 한 번에 찾아주는 PoC.",
};

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
    >
      {children}
    </Link>
  );
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-xl font-bold">
              청년원스톱
            </Link>
            <nav className="flex gap-1">
              <NavLink href="/">내 매칭</NavLink>
              <NavLink href="/policies">정책 탐색</NavLink>
              <NavLink href="/jobs">일자리·훈련</NavLink>
              <NavLink href="/draft">AI 신청서</NavLink>
              <NavLink href="/calendar">마감 캘린더</NavLink>
            </nav>
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
        <footer className="border-t border-slate-800 bg-slate-900/70 py-6 text-center text-sm text-slate-400">
          <p>
            © 2026 · 2026 전국 통합데이터 활용 공모전 출품작 ·{" "}
            <span className="font-semibold text-slate-200">로컬 LLM 전용</span>
          </p>
          <p className="mt-1 text-xs">
            출처: 온통청년 · 고용24 · LH · 서민금융진흥원 · HRD-Net (스키마 재현 mock)
          </p>
        </footer>
      </body>
    </html>
  );
}
