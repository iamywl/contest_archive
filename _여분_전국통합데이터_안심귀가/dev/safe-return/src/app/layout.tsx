import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "안심귀가 · Safe Return",
  description:
    "공공 CCTV·가로등·편의점·지구대를 엮어 가장 밝은 귀가 경로를 찾아주는 MVP",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f0f14",
};

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
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
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <header className="border-b border-slate-800">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-base font-bold text-sky-300">
              🌙 안심귀가
            </Link>
            <nav className="flex flex-wrap gap-1">
              <NavLink href="/">홈</NavLink>
              <NavLink href="/route">경로 지도</NavLink>
              <NavLink href="/share">보호자 공유</NavLink>
              <NavLink href="/sos">긴급 모드</NavLink>
              <NavLink href="/report">리포트</NavLink>
            </nav>
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
