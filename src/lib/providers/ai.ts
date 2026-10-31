/**
 * AI Provider boundary – free models only.
 * AI is OFF by default. Never routes to paid models.
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

export async function callAI(params: {
  provider: AIProvider;
  model: string;
  prompt: string;
  system?: string;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<{ text: string } | { error: string }> {
  if (params.provider === "off") {
    return { error: "AI is disabled" };
  }

  if (!params.model) {
    params = { ...params, model: defaultModel(params.provider) };
  }

  if (!isModelAllowed(params.provider, params.model)) {
    return {
      error: `Model "${params.model}" is not in the free-model allow-list for ${params.provider}. Paid models are forbidden.`,
    };
  }

  const apiKey =
    params.provider === "groq"
      ? process.env.GROQ_API_KEY
      : process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return { error: `No API key configured for ${params.provider}` };
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

  const base: Parameters<typeof chatCompletion>[0] = {
    baseUrl:
      params.provider === "groq"
        ? "https://api.groq.com/openai/v1"
        : "https://openrouter.ai/api/v1",
    apiKey,
    model: params.model,
    messages,
    maxTokens: params.maxTokens ?? 512,
    timeoutMs: params.timeoutMs ?? 10_000,
    extraHeaders:
      params.provider === "openrouter"
        ? {
            "HTTP-Referer": process.env.APP_URL ?? "https://shopngo.pages.dev",
            "X-Title": "ShopNGo",
          }
        : undefined,
  };

  const first = await chatCompletion(base);
  if ("text" in first) return first;

  // Groq: retry the next free model in the fallback chain
  if (params.provider === "groq") {
    const idx = (GROQ_MODEL_FALLBACKS as readonly string[]).indexOf(params.model);
    for (const model of GROQ_MODEL_FALLBACKS.slice(idx + 1)) {
      const retry = await chatCompletion({ ...base, model });
      if ("text" in retry) return retry;
    }
  }
  return first;
}

export function getFreeModelAllowList() {
  return {
    groq: GROQ_MODEL_FALLBACKS,
    openrouter: [OPENROUTER_DEFAULT],
  };
}