#!/usr/bin/env node
// @ts-check
/**
 * Playwright 기반 스크린샷 자동화 스크립트.
 *
 * 실행:
 *   node _여분_공유/scripts/capture.mjs <baseUrl> <outDir> [--routes=/,/profile,/map] [--viewport=375x812]
 *
 * 예:
 *   node _여분_공유/scripts/capture.mjs http://localhost:3000 ./docs/screenshots \
 *     --routes=/,/shelter,/voice,/bus,/guardian
 *
 * 전국통합데이터 공모전 CLAUDE.md + 현대오토에버 CLAUDE.md의
 * '실제 구동된 소프트웨어 캡처' 요구를 자동화한다.
 *
 * 의존성:
 *   pnpm add -D playwright && pnpm exec playwright install chromium
 */

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";

async function main() {
  const { positionals, values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      routes: { type: "string", default: "/" },
      viewport: { type: "string", default: "390x844" }, // iPhone 15 Pro
      waitMs: { type: "string", default: "800" },
      fullPage: { type: "boolean", default: true },
    },
    allowPositionals: true,
  });

  const [baseUrl, outDir] = positionals;
  if (!baseUrl || !outDir) {
    console.error(
      "usage: capture.mjs <baseUrl> <outDir> [--routes=/,/a,/b] [--viewport=WxH] [--waitMs=800] [--no-fullPage]",
    );
    process.exit(2);
  }

  const routes = values.routes.split(",").map((r) => r.trim()).filter(Boolean);
  const [vw, vh] = values.viewport.split("x").map((n) => Number.parseInt(n, 10));
  const waitMs = Number.parseInt(values.waitMs, 10);

  await mkdir(outDir, { recursive: true });

  // Lazy import so the script fails with a clear message if playwright is missing.
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch (error) {
    console.error(
      "[capture] playwright is not installed. Run `pnpm add -D playwright` and `pnpm exec playwright install chromium`.",
    );
    process.exit(3);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: vw, height: vh },
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    reducedMotion: "reduce",
    colorScheme: "light",
  });
  const page = await context.newPage();

  const results = [];
  for (const [idx, route] of routes.entries()) {
    const url = new URL(route, baseUrl).href;
    const safeName = route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "_");
    const filename = `${String(idx + 1).padStart(2, "0")}_${safeName}.png`;
    const outPath = join(outDir, filename);

    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
      await page.waitForTimeout(waitMs);
      await page.screenshot({ path: outPath, fullPage: values.fullPage });
      console.log(`✅ ${filename}  ←  ${url}`);
      results.push({ route, url, file: outPath, ok: true });
    } catch (error) {
      console.error(`❌ ${filename}  ←  ${url}`, error?.message);
      results.push({ route, url, file: outPath, ok: false, error: String(error) });
    }
  }

  await browser.close();

  const okCount = results.filter((r) => r.ok).length;
  console.log(`\n[capture] ${okCount}/${results.length} screenshots saved to ${outDir}`);
  if (okCount !== results.length) process.exit(1);
}

main().catch((error) => {
  console.error("[capture] fatal:", error);
  process.exit(1);
});
