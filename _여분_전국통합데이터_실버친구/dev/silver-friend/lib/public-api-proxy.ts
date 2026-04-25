/**
 * 공공데이터 API 프록시 재노출.
 *
 * 실제 구현은 `_여분_공유/lib/public-api-proxy.ts` (단일 진실 출처).
 * 복사 금지 — 여기서는 경로 별칭만 제공.
 */

export {
  fetchPublic,
  hasApiKey,
  clearCache,
} from "@shared/lib/public-api-proxy";
export type { FetchPublicOptions } from "@shared/lib/public-api-proxy";
