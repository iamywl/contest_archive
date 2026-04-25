import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "나들이맵 — 유아 동반 나들이의 주차·화장실·수유실을 한 화면에",
  description:
    "공영주차장 실시간 + 공중화장실 기저귀교환대 + 수유실 + 어린이도서관 + 공원을 단일 지도에 통합한 유아 동반 나들이 동선 플래너",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f7b3a",
};

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-emerald-100 hover:text-emerald-900"
    >
      {children}
    </Link>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <header className="border-b border-zinc-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-3">
            <Link href="/" className="text-xl font-bold text-emerald-700">
              🍀 나들이맵
            </Link>
            <nav className="flex flex-wrap gap-1">
              <NavLink href="/">오늘 나들이</NavLink>
              <NavLink href="/map">지도</NavLink>
              <NavLink href="/filter">유아 필터</NavLink>
              <NavLink href="/forecast">혼잡 예측</NavLink>
              <NavLink href="/diary">나들이 일기</NavLink>
            </nav>
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
        <footer className="border-t border-zinc-200 bg-white/60 py-4 text-center text-xs text-zinc-500">
          © 2026 · 2026 전국 통합데이터 활용 공모전 출품작 · 로컬 LLM 전용
        </footer>
      </body>
    </html>
  );
}
