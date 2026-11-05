import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callAI, resetFreeModelCache } from "./ai";

const ok = (text: string) => new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 });
const fail = (status: number) => new Response("nope", { status });

describe("callAI provider chain", () => {
  const env = { ...process.env };
  beforeEach(() => {
    resetFreeModelCache();
    delete process.env.GROQ_API_KEY;
    delete process.env.AI_ENABLED;
    process.env.OPENROUTER_API_KEY = "test-or";
  });
  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  it("uses Groq first when its key is set", async () => {
    process.env.GROQ_API_KEY = "g";
    const f = vi.fn(async () => ok("from groq"));
    vi.stubGlobal("fetch", f);
    const r = await callAI({ prompt: "hi" });
    expect(r).toEqual({ text: "from groq", provider: "groq" });
    expect(String((f.mock.calls[0] as unknown[])[0])).toContain("groq.com");
  });

  it("falls to OpenRouter when Groq fails, then the next free model on 429", async () => {
    process.env.GROQ_API_KEY = "g";
    const urls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (u: string, init: { body: string }) => {
      urls.push(u);
      if (u.includes("groq")) return fail(500);
      const model = JSON.parse(init.body).model as string;
      return model.startsWith("nvidia/nemotron-3-ultra") ? fail(429) : ok("from openrouter");
    }));
    const r = await callAI({ prompt: "hi" });
    expect(r).toEqual({ text: "from openrouter", provider: "openrouter" });
  });

  it("goes keyless when OpenRouter models all fail", async () => {
    vi.stubGlobal("fetch", vi.fn(async (u: string) => (u.includes("openrouter.ai") ? fail(429) : ok("keyless answer"))));
    const r = await callAI({ prompt: "hi" });
    expect(r).toEqual({ text: "keyless answer", provider: "keyless" });
  });

  it("discovers free models at runtime when configured ones return 404", async () => {
    const f = vi.fn(async (u: string, init?: { body: string }) => {
      if (u.endsWith("/models")) return new Response(JSON.stringify({ data: [{ id: "new/model-x:free" }, { id: "paid/m" }] }), { status: 200 });
      if (u.includes("openrouter.ai")) return JSON.parse(init!.body).model === "new/model-x:free" ? ok("discovered") : fail(404);
      return fail(500);
    });
    vi.stubGlobal("fetch", f);
    const r = await callAI({ prompt: "hi" });
    expect(r).toEqual({ text: "discovered", provider: "openrouter" });
  });

  it("returns an error only when every provider fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => fail(500)));
    const r = await callAI({ prompt: "hi", timeoutMs: 1000 });
    expect("error" in r).toBe(true);
  });
});
