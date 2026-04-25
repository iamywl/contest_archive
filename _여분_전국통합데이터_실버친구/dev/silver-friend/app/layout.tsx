import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "실버친구 — 오늘 어디 갈까요?",
  description:
    "경로당·무더위쉼터·저상버스·공원을 한 화면에 모은 고령자 전용 공공 나들이 앱.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-a11y-bg text-a11y-text">
        {children}
      </body>
    </html>
  );
}
