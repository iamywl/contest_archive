/**
 * 공공데이터 API 프록시 유틸 (TypeScript / Next.js).
 *
 * 사용 시나리오: Next.js Route Handler에서 공공데이터포털 API를 호출할 때
 *  - 5분 TTL 인메모리 캐시로 상류 Rate Limit·장애 완화
 *  - stale-while-revalidate 로 캐시 만료 시 낡은 값을 반환하고 백그라운드 갱신
 *  - 인증키 부재 시 mock-fixtures/ 의 JSON 폴백
 *
 * 시크릿은 `.env.local` 에 `PUBLIC_DATA_API_KEY=...` 로 두고,
 * 서버 컴포넌트/Route Handler에서만 `process.env` 로 읽는다 (브라우저 노출 금지).
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type FetchPublicOptions = {
  /** 캐시 TTL (ms). 기본 5분. */
  ttlMs?: number;
  /** stale 허용 최대 시간 (ms). 기본 1시간. */
  staleWhileRevalidateMs?: number;
  /** 요청 타임아웃 (ms). 기본 8초. */
  timeoutMs?: number;
  /** 인증키 미보유 시 폴백할 mock fixture 상대 경로 (mock-fixtures/ 기준). */
  mockFixture?: string;
  /** 추가 헤더. */
  headers?: Record<string, string>;
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  staleUntil: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const SHARED_DIR = join(process.cwd(), "..", "..", "..", "_여분_공유");
const MOCK_DIR = join(SHARED_DIR, "mock-fixtures");

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_STALE_MS = 60 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 8_000;

/**
 * 공공데이터 API 호출. 캐시·SWR·mock 폴백을 일괄 처리.
 *
 * @param url - 호출할 외부 API URL (인증키 쿼리 포함 완전체)
 * @param options - 캐시/타임아웃/mock 옵션
 */
export async function fetchPublic<T = unknown>(
  url: string,
  options: FetchPublicOptions = {},
): Promise<T> {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const staleMs = options.staleWhileRevalidateMs ?? DEFAULT_STALE_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const now = Date.now();

  const entry = cache.get(url) as CacheEntry<T> | undefined;

  if (entry && now < entry.expiresAt) {
    return entry.value;
  }

  if (entry && now < entry.staleUntil) {
    // stale-while-revalidate: 즉시 stale 반환하고 백그라운드 갱신 킥.
    scheduleRevalidation(url, options, ttlMs, staleMs, timeoutMs).catch((err) =>
      console.warn("[public-api-proxy] background revalidation failed:", err),
    );
    return entry.value;
  }

  // 만료 + stale 만료 → 동기 재요청.
  try {
    return await refresh<T>(url, options, ttlMs, staleMs, timeoutMs);
  } catch (error) {
    // 인증키 없음 또는 상류 장애 → mock 폴백.
    if (options.mockFixture) {
      const fallback = await loadMock<T>(options.mockFixture);
      cache.set(url, {
        value: fallback,
        expiresAt: now + ttlMs,
        staleUntil: now + ttlMs + staleMs,
      });
      return fallback;
    }
    throw error;
  }
}

async function scheduleRevalidation<T>(
  url: string,
  options: FetchPublicOptions,
  ttlMs: number,
  staleMs: number,
  timeoutMs: number,
): Promise<void> {
  if (inflight.has(url)) return;
  const promise = refresh<T>(url, options, ttlMs, staleMs, timeoutMs).finally(() => {
    inflight.delete(url);
  });
  inflight.set(url, promise as Promise<unknown>);
  await promise;
}

async function refresh<T>(
  url: string,
  options: FetchPublicOptions,
  ttlMs: number,
  staleMs: number,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: options.headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Upstream ${response.status}: ${await response.text()}`);
    }
    const data = (await response.json()) as T;
    const now = Date.now();
    cache.set(url, {
      value: data,
      expiresAt: now + ttlMs,
      staleUntil: now + ttlMs + staleMs,
    });
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function loadMock<T>(relativePath: string): Promise<T> {
  const path = join(MOCK_DIR, relativePath);
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as T;
}

/** 인증키 존재 여부 헬퍼. */
export function hasApiKey(envVar = "PUBLIC_DATA_API_KEY"): boolean {
  return Boolean(process.env[envVar]?.trim());
}

/** 캐시 수동 초기화 (테스트/개발용). */
export function clearCache(): void {
  cache.clear();
  inflight.clear();
}
