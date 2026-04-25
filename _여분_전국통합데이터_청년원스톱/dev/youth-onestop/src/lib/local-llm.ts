/**
 * 로컬 Ollama LLM 래퍼 (청년원스톱 전용 경량 버전).
 *
 * 저장소 루트 CLAUDE.md §7: OpenAI/Claude/Gemini 등 클라우드 AI API 금지.
 * 기본 모델: devstral-2:123b (법제처 RAG), 부하가 큰 경우 qwen2.5:32b 로 교체.
 */

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";

export async function ollamaChatJson<T>(
  messages: ChatMessage[],
  options: {
    model?: string;
    temperature?: number;
    timeoutMs?: number;
  } = {},
): Promise<T | null> {
  const model = options.model ?? "qwen2.5:32b-instruct-q4_K_M";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 180_000);

  try {
    const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        format: "json",
        options: { temperature: options.temperature ?? 0.2 },
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { message?: { content?: string } };
    const content = data.message?.content ?? "";
    try {
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
