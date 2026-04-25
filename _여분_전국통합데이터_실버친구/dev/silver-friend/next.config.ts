import type { NextConfig } from "next";
import path from "node:path";

/**
 * 실버친구 Next.js 16 설정.
 *
 * `@shared/*` 별칭으로 `_여분_공유/` 리소스를 참조한다 (tsconfig.json paths 와 일치).
 *
 * Turbopack 은 한국어 경로(`_여분_...`)에서 UTF-8 char boundary 패닉이 발생하므로
 * 본 프로젝트는 webpack 빌더를 사용한다 (`next dev|build --webpack`).
 */
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

const nextConfig: NextConfig = {
  devIndicators: false,
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@shared": path.join(REPO_ROOT, "_여분_공유"),
    };
    return config;
  },
};

export default nextConfig;
