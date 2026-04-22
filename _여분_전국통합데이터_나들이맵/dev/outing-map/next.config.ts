import type { NextConfig } from "next";
import { join } from "node:path";

const nextConfig: NextConfig = {
  // 공용 리소스(`_여분_공유/`) 참조 허용 — 모노레포 루트 외부 경로를 명시.
  outputFileTracingRoot: join(__dirname, "..", "..", ".."),
  devIndicators: false,
};

export default nextConfig;
