/**
 * Grounded AI Ask – free models only, catalogue-grounded.
 * Falls back to deterministic search when AI is disabled or rate-limited.
 */

import { callAI } from "@/lib/providers/ai";
import { getServerEnv } from "@/lib/env";

export async function groundedAsk(question: string, contextSnippets: string[]): Promise<{
  answer: string;
  evidence: string[];
  source: "ai" | "fallback";
}> {
  const env = getServerEnv();
  const evidence = contextSnippets.slice(0, 5);

  if (!env.AI_ENABLED || env.AI_PROVIDER === "off") {
    return {
      answer: "AI is currently disabled. Please use the search page to find products.",
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