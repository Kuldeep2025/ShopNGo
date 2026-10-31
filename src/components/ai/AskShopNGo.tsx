"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Button, Spinner } from "@/components/ui";

/**
 * AskShopNGo – floating AI shopping assistant.
 * Calls the server-side /api/ai/ask endpoint (keys never leave the server).
 * Additive: hidden on auth pages and can be collapsed.
 */
export function AskShopNGo() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"ai" | "fallback" | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (pathname?.startsWith("/auth")) return null;

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (q.length < 3 || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Assistant unavailable right now");
      } else {
        setAnswer(data.answer ?? "");
        setSource(data.source ?? null);
      }
    } catch {
      setError("Network error – please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2" ref={panelRef}>
      {open && (
        <div
          className="w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-teal-200/70 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
          role="dialog"
          aria-label="Ask ShopNGo assistant"
        >
          <div className="flex items-center justify-between bg-gradient-to-r from-teal-700 to-teal-600 px-4 py-3 dark:from-teal-900 dark:to-teal-800">
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs" aria-hidden="true">✦</span>
              Ask ShopNGo
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="Close assistant"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto p-4">
            {!answer && !loading && !error && (
              <div className="space-y-2 text-sm text-gray-600 dark:text-zinc-400">
                <p>Hi! I can answer questions about our catalogue — prices, product types, and stores.</p>
                <p className="text-xs">Try:</p>
                <ul className="space-y-1">
                  {["How much are the earbuds?", "What courses are available?", "Is there a physics notes PDF?"].map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        className="rounded-full border border-teal-200 px-3 py-1 text-xs text-teal-800 transition hover:bg-teal-50 dark:border-teal-800 dark:text-teal-300 dark:hover:bg-teal-950"
                        onClick={() => setQuestion(s)}
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {loading && (
              <div className="flex justify-center py-4">
                <Spinner size="md" label="Thinking" />
              </div>
            )}
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {error}
              </p>
            )}
            {answer && (
              <div className="space-y-2">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-zinc-200">
                  {answer}
                </p>
                <p className="text-[11px] text-gray-400">
                  {source === "ai" ? "Answered by AI from live catalogue data" : "Fallback answer – AI not active"}
                </p>
              </div>
            )}
          </div>

          <form onSubmit={ask} className="flex gap-2 border-t border-gray-100 p-3 dark:border-zinc-800">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about any product…"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              aria-label="Your question"
              maxLength={500}
            />
            <Button type="submit" size="sm" loading={loading} className="shrink-0">
              Ask
            </Button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-3 font-semibold text-white shadow-xl shadow-teal-900/30 transition hover:scale-105 hover:from-teal-500 hover:to-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12a8.96 8.96 0 01-4.06 7.5A8.97 8.97 0 0112 21a8.96 8.96 0 01-4.94-1.5L3 21l1.5-4.06A8.96 8.96 0 013 12a8.97 8.97 0 011.5-4.94A8.96 8.96 0 0112 3a9 9 0 019 9z" />
        </svg>
        <span className="hidden text-sm sm:inline">Ask AI</span>
      </button>
    </div>
  );
}