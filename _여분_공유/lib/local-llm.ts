/**
 * 로컬 LLM 어댑터 — Ollama HTTP 클라이언트 (TypeScript / Next.js).
 *
 * 저장소 루트 CLAUDE.md §7 준수: API 기반 AI 금지, Ollama 로컬만 허용.
 * 기본 백엔드: Ollama (http://localhost:11434).
 *
 * 모델 alias:
 *   "chat"   → llama3.3:70b-instruct-q4_K_M  (범용 Tool-use)
 *   "ko"     → qwen2.5:32b-instruct-q4_K_M   (한국어 특화)
 *   "large"  → devstral-2:123b
 *   "small"  → qwen2.5:7b-instruct-q4_K_M    (경량 분류)
 *   "aac"    → gemma3:27b-instruct-q4_K_M
 *   "embed"  → nomic-embed-text
 */

export const OLLAMA_HOST =
  process.env.OLLAMA_HOST ?? "http://localhost:11434";

export const MODEL_ALIAS: Record<string, string> = {
  chat: "llama3.3:70b-instruct-q4_K_M",
  ko: "qwen2.5:32b-instruct-q4_K_M",
  large: "devstral-2:123b",
  small: "qwen2.5:7b-instruct-q4_K_M",
  aac: "gemma3:27b-instruct-q4_K_M",
  embed: "nomic-embed-text",
};

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type ChatResponse = {
  text: string;
  model: string;
  totalDurationMs: number;
  promptEvalCount: number;
  evalCount: number;
};

export type LocalLLMOptions = {
  model?: keyof typeof MODEL_ALIAS | string;
  host?: string;
  timeoutMs?: number;
  system?: string;
};

/**
 * Ollama 로컬 LLM 래퍼. 생성 후 chat/chatJson/chatStream/embed 호출.
 */
export class LocalLLM {
  private readonly model: string;
  private readonly host: string;
  private readonly timeoutMs: number;
  private readonly system?: string;

  constructor(options: LocalLLMOptions = {}) {
    const aliasOrName = options.model ?? "chat";
    this.model = MODEL_ALIAS[aliasOrName as string] ?? aliasOrName;
    this.host = (options.host ?? OLLAMA_HOST).replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 300_000;
    this.system = options.system;
  }

  private buildMessages(messages: ChatMessage[]): ChatMessage[] {
    if (this.system && !(messages[0]?.role === "system")) {
      return [{ role: "system", content: this.system }, ...messages];
    }
    return messages;
  }

  private async request(path: string, body: unknown): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.host}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(
          `Ollama ${path} failed: ${response.status} ${detail.slice(0, 200)}`,
        );
      }
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  /** 동기 chat. 전체 응답을 한 번에 반환. */
  async chat(
    messages: ChatMessage[],
    opts: { temperature?: number; numCtx?: number } = {},
  ): Promise<ChatResponse> {
    const response = await this.request("/api/chat", {
      model: this.model,
      messages: this.buildMessages(messages),
      stream: false,
      options: {
        temperature: opts.temperature ?? 0.2,
        ...(opts.numCtx ? { num_ctx: opts.numCtx } : {}),
      },
    });
    const data = await response.json();
    return {
      text: data.message?.content ?? "",
      model: data.model ?? this.model,
      totalDurationMs: Math.floor((data.total_duration ?? 0) / 1_000_000),
      promptEvalCount: data.prompt_eval_count ?? 0,
      evalCount: data.eval_count ?? 0,
    };
  }

  /** 스트리밍 chat. 토큰 단위 AsyncGenerator. */
  async *chatStream(
    messages: ChatMessage[],
    opts: { temperature?: number } = {},
  ): AsyncGenerator<string, void, unknown> {
    const response = await this.request("/api/chat", {
      model: this.model,
      messages: this.buildMessages(messages),
      stream: true,
      options: { temperature: opts.temperature ?? 0.2 },
    });

    if (!response.body) {
      throw new Error("Ollama streaming response has no body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const chunk = JSON.parse(line);
        if (chunk.message?.content) yield chunk.message.content as string;
        if (chunk.done) return;
      }
    }
  }

  /** JSON 강제 출력. 스키마는 프롬프트로 전달, 최종 검증은 호출부 책임. */
  async chatJson<T = unknown>(
    messages: ChatMessage[],
    opts: { temperature?: number } = {},
  ): Promise<T> {
    const response = await this.request("/api/chat", {
      model: this.model,
      messages: this.buildMessages(messages),
      stream: false,
      format: "json",
      options: { temperature: opts.temperature ?? 0.1 },
    });
    const data = await response.json();
    const raw = data.message?.content ?? "";
    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      throw new Error(`LLM returned invalid JSON: ${raw.slice(0, 200)}`);
    }
  }

  /** 임베딩. 기본 모델: nomic-embed-text. */
  async embed(text: string | string[]): Promise<number[][]> {
    const embedModel = MODEL_ALIAS.embed;
    const inputs = Array.isArray(text) ? text : [text];
    const results: number[][] = [];
    for (const input of inputs) {
      const response = await this.request("/api/embeddings", {
        model: embedModel,
        prompt: input,
      });
      const data = await response.json();
      results.push(data.embedding as number[]);
    }
    return results;
  }

  /** Ollama 서버 생존 체크. */
  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.host}/api/tags`, {
        signal: AbortSignal.timeout(2_000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
