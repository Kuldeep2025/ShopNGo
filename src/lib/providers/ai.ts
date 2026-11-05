/**
 * AI Provider boundary – free models only.
 * AI is ON by default (set AI_ENABLED=false to turn it off). Never routes to paid models.
 *
 * Keys are read from server-side environment variables only
 * (GROQ_API_KEY / OPENROUTER_API_KEY) and are never bundled for the client.
 * Model IDs verified against provider docs (Oct 2026):
 *  - Groq production text models: llama-3.1-8b-instant, llama-3.3-70b-versatile,
 *    openai/gpt-oss-20b, openai/gpt-oss-120b
 *  - OpenRouter: "openrouter/free" router auto-picks from available free models;
 *    any id ending in ":free" is a free variant.
 */

const GROQ_MODEL_FALLBACKS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "openai/gpt-oss-20b",
] as const;

const OPENROUTER_DEFAULT = "openrouter/free";

export type AIProvider = "off" | "groq" | "openrouter";

export function isModelAllowed(provider: AIProvider, modelId: string): boolean {
  if (provider === "off") return false;
  if (provider === "groq") {
    return (GROQ_MODEL_FALLBACKS as readonly string[]).includes(modelId);
  }
  if (provider === "openrouter") {
    return modelId === OPENROUTER_DEFAULT || modelId.endsWith(":free");
  }
  return false;
}

function defaultModel(provider: AIProvider): string {
  if (provider === "groq") return GROQ_MODEL_FALLBACKS[0];
  if (provider === "openrouter") return OPENROUTER_DEFAULT;
  return "";
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function chatCompletion(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  maxTokens: number;
  timeoutMs: number;
  extraHeaders?: Record<string, string>;
}): Promise<{ text: string } | { error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), params.timeoutMs);
  try {
    const res = await fetch(`${params.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
        ...(params.extraHeaders ?? {}),
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        max_tokens: params.maxTokens,
        temperature: 0.3,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { error: `Provider returned ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}` };
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return { error: "Empty response from provider" };
    return { text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: msg.includes("aborted") ? "Request timed out" : msg };
  } finally {
    clearTimeout(timer);
  }
}

export type AIResult = { text: string; provider: "groq" | "openrouter" | "keyless" } | { error: string };

// Keyless endpoints, tried in order. Both are OpenAI-compatible and need no account.
// The free tiers are rate limited per IP, so they are best effort only.
const KEYLESS_ENDPOINTS: Array<{ url: string; model: string; headers?: Record<string, string> }> = [
  { url: "https://text.pollinations.ai/openai", model: "openai" },
  { url: "https://api.llm7.io/v1/chat/completions", model: "DeepSeek-V4-Flash-0731", headers: { Authorization: "Bearer unused" } },
  { url: "https://api.llm7.io/v1/chat/completions", model: "GLM-5.3-Flash", headers: { Authorization: "Bearer unused" } },
];

async function keylessCompletion(
  ep: (typeof KEYLESS_ENDPOINTS)[number],
  messages: ChatMessage[],
  maxTokens: number,
  timeoutMs: number
): Promise<{ text: string } | { error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(ep.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(ep.headers ?? {}) },
      body: JSON.stringify({ model: ep.model, messages, max_tokens: maxTokens, temperature: 0.3, stream: false }),
      signal: controller.signal,
    });
    if (!res.ok) return { error: `Keyless provider returned ${res.status}` };
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return { error: "Empty response from keyless provider" };
    return { text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: msg.includes("abort") ? "Request timed out" : msg };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Provider chain: Groq (if key) -> OpenRouter (if key) -> keyless provider.
 * Every failure (429, timeout, error) falls through to the next one.
 * Returns an error only when all of them fail; the caller then uses the offline summary.
 */
export async function callAI(params: {
  provider?: AIProvider;
  model?: string;
  prompt: string;
  system?: string;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<AIResult> {
  if (params.provider === "off" || process.env.AI_ENABLED === "false") {
    return { error: "AI is disabled" };
  }

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        params.system ??
        "You are ShopNGo catalogue assistant. Answer ONLY from the provided context. If the answer is not in the context, say \"Not provided in catalogue data.\"",
    },
    { role: "user", content: params.prompt },
  ];
  const maxTokens = params.maxTokens ?? 512;
  const timeoutMs = params.timeoutMs ?? 10_000;
  const errors: string[] = [];

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const wanted = params.model && isModelAllowed("groq", params.model) ? params.model : GROQ_MODEL_FALLBACKS[0];
    const order = [wanted, ...GROQ_MODEL_FALLBACKS.filter((m) => m !== wanted)];
    for (const model of order) {
      const r = await chatCompletion({
        baseUrl: "https://api.groq.com/openai/v1",
        apiKey: groqKey,
        model,
        messages,
        maxTokens,
        timeoutMs,
      });
      if ("text" in r) return { text: r.text, provider: "groq" };
      errors.push(`groq: ${r.error}`);
    }
  }

  const orKey = process.env.OPENROUTER_API_KEY;
  if (orKey) {
    const model = params.model && isModelAllowed("openrouter", params.model) ? params.model : OPENROUTER_DEFAULT;
    const r = await chatCompletion({
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: orKey,
      model,
      messages,
      maxTokens,
      timeoutMs,
      extraHeaders: {
        "HTTP-Referer": process.env.APP_URL ?? "https://shopngo.pages.dev",
        "X-Title": "ShopNGo",
      },
    });
    if ("text" in r) return { text: r.text, provider: "openrouter" };
    errors.push(`openrouter: ${r.error}`);
  }

  for (const ep of KEYLESS_ENDPOINTS) {
    const r = await keylessCompletion(ep, messages, maxTokens, Math.max(timeoutMs, 20_000));
    if ("text" in r) return { text: r.text, provider: "keyless" };
    errors.push(`keyless: ${r.error}`);
  }

  return { error: errors.join(" | ").slice(0, 400) };
}

export function getFreeModelAllowList() {
  return {
    groq: GROQ_MODEL_FALLBACKS,
    openrouter: [OPENROUTER_DEFAULT],
  };
}