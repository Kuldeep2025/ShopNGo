import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callAI } from "../ai";

const ok = (text: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 });
const fail = (status: number) => new Response("nope", { status });

describe("callAI provider chain", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    delete process.env.GROQ_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.AI_ENABLED;
  });
  afterEach(() => {
    process.env = { ...saved };
    vi.unstubAllGlobals();
  });

  it("uses the keyless provider when no key is set", async () => {
    const f = vi.fn().mockResolvedValue(ok("hello"));
    vi.stubGlobal("fetch", f);
    const r = await callAI({ prompt: "hi" });
    expect(r).toEqual({ text: "hello", provider: "keyless" });
    expect(String(f.mock.calls[0][0])).toContain("pollinations");
  });

  it("falls from groq (all models 429) to openrouter", async () => {
    process.env.GROQ_API_KEY = "g";
    process.env.OPENROUTER_API_KEY = "o";
    const f = vi.fn().mockImplementation(async (url: string) =>
      String(url).includes("groq") ? fail(429) : ok("from openrouter")
    );
    vi.stubGlobal("fetch", f);
    const r = await callAI({ prompt: "hi" });
    expect(r).toEqual({ text: "from openrouter", provider: "openrouter" });
  });

  it("falls to keyless when groq and openrouter fail", async () => {
    process.env.GROQ_API_KEY = "g";
    process.env.OPENROUTER_API_KEY = "o";
    const f = vi.fn().mockImplementation(async (url: string) =>
      String(url).includes("pollinations") ? ok("keyless answer") : fail(500)
    );
    vi.stubGlobal("fetch", f);
    const r = await callAI({ prompt: "hi" });
    expect(r).toEqual({ text: "keyless answer", provider: "keyless" });
  });

  it("first groq model answering wins", async () => {
    process.env.GROQ_API_KEY = "g";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok("groq answer")));
    expect(await callAI({ prompt: "hi" })).toEqual({ text: "groq answer", provider: "groq" });
  });

  it("returns an error (no key text) when everything fails", async () => {
    process.env.GROQ_API_KEY = "secretkey123";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fail(503)));
    const r = await callAI({ prompt: "hi" });
    expect("error" in r).toBe(true);
    expect(JSON.stringify(r)).not.toContain("secretkey123");
  });

  it("is off only when AI_ENABLED=false", async () => {
    process.env.AI_ENABLED = "false";
    expect(await callAI({ prompt: "hi" })).toEqual({ error: "AI is disabled" });
  });
});
