import type { Metadata, Viewport } from "next";
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        {children}
      </body>
    </html>
  );
}
