/**
 * Grounded AI Ask – free models only, catalogue-grounded.
 * Falls back to deterministic search when AI is disabled or rate-limited.
 */

import { callAI } from "@/lib/providers/ai";
import { getServerEnv } from "@/lib/env";

function summariseEvidence(evidence: string[]): string {
  if (evidence.length === 0) {
    return "I could not find a matching product. Try the search page with different words.";
  }
  const lines = evidence.map((e) => {
    const get = (k: string) => e.split("\n").find((l) => l.startsWith(`${k}:`))?.slice(k.length + 1).trim();
    const title = get("Title") ?? "Product";
    const price = get("Price");
    const store = get("Store");
    return `${title}${price ? `, ${price}` : ""}${store ? `, sold by ${store}` : ""}`;
  });
  return `Here is what the catalogue has: ${lines.join("; ")}.`;
}

export async function groundedAsk(question: string, contextSnippets: string[]): Promise<{
  answer: string;
  evidence: string[];
  source: "ai" | "fallback";
}> {
  const env = getServerEnv();
  const evidence = contextSnippets.slice(0, 5);

  if (!env.AI_ENABLED || env.AI_PROVIDER === "off") {
    return {
      answer: summariseEvidence(evidence),
      evidence,
      source: "fallback",
    };
  }

  const prompt = `Catalogue evidence:\n${evidence.join("\n---\n") || "(none available)"}\n\nShopper question: ${question}\n\nAnswer ONLY from the evidence. If the answer is not in the evidence, say "Not provided in catalogue data." Keep it short and helpful.`;

  const result = await callAI({
    provider: env.AI_PROVIDER,
    model: env.AI_MODEL && env.AI_MODEL.trim() ? env.AI_MODEL : "",
    prompt,
    maxTokens: env.AI_MAX_OUTPUT_TOKENS ? Number(env.AI_MAX_OUTPUT_TOKENS) : 512,
  });

  if ("error" in result) {
    return {
      answer: `AI unavailable (${result.error}). Please use search instead.`,
      evidence,
      source: "fallback",
    };
  }

  return { answer: result.text, evidence, source: "ai" };
}