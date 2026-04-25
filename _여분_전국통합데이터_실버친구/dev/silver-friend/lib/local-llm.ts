/**
 * 로컬 LLM 어댑터 재노출.
 *
 * 실제 구현은 `_여분_공유/lib/local-llm.ts` (단일 진실 출처).
 * 저장소 루트 CLAUDE.md §7: API 기반 AI 금지, Ollama 로컬만 허용.
 */

export { LocalLLM, MODEL_ALIAS, OLLAMA_HOST } from "@shared/lib/local-llm";
export type {
  ChatMessage,
  ChatResponse,
  LocalLLMOptions,
} from "@shared/lib/local-llm";
