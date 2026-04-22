import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "런메이트 — 오늘 러닝 가능?",
  description:
    "대기질·날씨·공영자전거 반납소까지 묶어 러닝 가능 여부를 신호등 1장으로 제안",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f7b3a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-base font-bold text-[color:var(--color-primary)]">
              런메이트
            </Link>
            <nav className="flex gap-4 text-sm font-medium text-slate-600">
              <Link href="/" className="hover:text-[color:var(--color-primary)]">
                신호등
              </Link>
              <Link href="/course" className="hover:text-[color:var(--color-primary)]">
                코스 지도
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">{children}</main>
        <footer className="border-t border-[var(--color-border)] bg-white/70 py-4 text-center text-xs text-slate-500">
          공공데이터 활용 · Mock 폴백 · 로컬 LLM(Ollama qwen2.5:32b) 전용
        </footer>
      </body>
    </html>
  );
}
