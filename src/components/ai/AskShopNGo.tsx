"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AiAvatar } from "@/features/avatars/AiAvatar";
import { UserAvatar } from "@/features/avatars/UserAvatar";
import { useAvatars } from "@/features/avatars/AvatarProvider";
import {
  CHAT_KEY,
  CHAT_OPEN_KEY,
  formatTime,
  parseChat,
  serializeChat,
  shouldSendOnKey,
  type ChatMessage,
} from "@/features/ai/chatStore";

const SUGGESTIONS = ["Who built this website?", "Which stores and categories are there?", "Suggest a gift under 1000 rupees"];

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * AskShopNGo: floating AI shopping assistant.
 * Calls the server-side /api/ai/ask endpoint (keys never leave the server).
 * The conversation lives in sessionStorage so a refresh keeps it.
 */
export function AskShopNGo() {
  const pathname = usePathname();
  const { aiAvatar } = useAvatars();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState("");
  const [announce, setAnnounce] = useState("");
  const [restored, setRestored] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  // Restore after a refresh.
  useEffect(() => {
    try {
      setMessages(parseChat(sessionStorage.getItem(CHAT_KEY)));
      setOpen(sessionStorage.getItem(CHAT_OPEN_KEY) === "1");
    } catch {
      /* storage blocked */
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(CHAT_KEY, serializeChat(messages));
    } catch {
      /* ignore */
    }
  }, [messages, restored]);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(CHAT_OPEN_KEY, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open, restored]);

  // Newest at the bottom.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        launcherRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const request = useCallback(async (question: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      let data: { answer?: string; source?: "ai" | "fallback"; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        /* not JSON */
      }
      if (!res.ok || typeof data.answer !== "string" || !data.answer.trim()) {
        const msg =
          res.status === 429
            ? (data.error ?? "Too many questions at once. Please wait a minute and try again.")
            : "Sorry, I could not answer that just now. Please try again.";
        setMessages((m) => [...m, { id: newId(), role: "ai", text: msg, ts: new Date().toISOString(), error: true, retryOf: question }]);
      } else {
        setMessages((m) => [...m, { id: newId(), role: "ai", text: data.answer!, ts: new Date().toISOString(), source: data.source ?? null }]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { id: newId(), role: "ai", text: "Could not reach the assistant. Please check your connection and try again.", ts: new Date().toISOString(), error: true, retryOf: question },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  function send(raw?: string) {
    const q = (raw ?? text).trim();
    if (loading) return;
    if (q.length < 3) {
      setHint("Please type at least 3 characters.");
      inputRef.current?.focus();
      return;
    }
    setHint("");
    setMessages((m) => [...m, { id: newId(), role: "user", text: q, ts: new Date().toISOString() }]);
    setText("");
    inputRef.current?.focus();
    void request(q);
  }

  function retry(msg: ChatMessage) {
    if (loading || !msg.retryOf) return;
    setMessages((m) => m.filter((x) => x.id !== msg.id));
    void request(msg.retryOf);
    inputRef.current?.focus();
  }

  function clearChat() {
    setMessages([]);
    setHint("");
    setAnnounce("Chat cleared.");
    try {
      sessionStorage.removeItem(CHAT_KEY);
    } catch {
      /* ignore */
    }
    inputRef.current?.focus();
  }

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (pathname?.startsWith("/auth")) return null;

  const lastErrorId = [...messages].reverse().find((m) => m.error)?.id;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2" ref={panelRef}>
      {open && (
        <div
          className="flex w-[min(94vw,400px)] flex-col overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-2xl dark:border-zinc-600 dark:bg-zinc-900"
          role="dialog"
          aria-label="Ask ShopNGo assistant"
        >
          <div className="flex items-center justify-between gap-2 bg-teal-800 px-4 py-3 dark:bg-teal-900">
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <AiAvatar id={aiAvatar} size={28} />
              Ask ShopNGo
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearChat}
                disabled={messages.length === 0}
                className="rounded-lg px-2 py-1 text-xs font-medium text-white underline-offset-2 hover:bg-white/15 hover:underline disabled:opacity-60"
              >
                Clear chat
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  launcherRef.current?.focus();
                }}
                className="rounded-lg p-1.5 text-white hover:bg-white/15"
                aria-label="Close assistant"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div
            ref={logRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Conversation with the assistant"
            tabIndex={0}
            className="h-80 max-h-[50vh] space-y-3 overflow-y-auto bg-gray-50 p-3 dark:bg-zinc-950"
          >
            {messages.length === 0 && !loading && (
              <div className="space-y-2 text-sm text-gray-700 dark:text-zinc-300">
                <p>Hi! Ask me anything about our products, prices, stores, the developers, or shopping ideas. No sign-in needed.</p>
                <p className="text-xs">Try one of these:</p>
                <ul className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        className="rounded-full border border-teal-700 px-3 py-1 text-xs font-medium text-teal-800 hover:bg-teal-50 dark:border-teal-400 dark:text-teal-300 dark:hover:bg-teal-950"
                        onClick={() => send(s)}
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {messages.map((m) => {
              const mine = m.role === "user";
              const time = formatTime(m.ts);
              return (
                <div key={m.id} className={`flex items-start gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                  {mine ? <UserAvatar size={32} /> : <AiAvatar id={aiAvatar} size={32} />}
                  <div className={`min-w-0 max-w-[80%] ${mine ? "text-right" : ""}`}>
                    <p aria-hidden="true" className="mb-0.5 text-xs font-semibold text-gray-700 dark:text-zinc-300">
                      {mine ? "You" : "AI"} <span className="font-normal text-gray-600 dark:text-zinc-400">· {time}</span>
                    </p>
                    <div
                      className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-left text-sm leading-relaxed ${
                        mine
                          ? "bg-teal-800 text-white dark:bg-teal-700"
                          : m.error
                            ? "border border-red-700 bg-red-50 text-red-900 dark:border-red-400 dark:bg-red-950 dark:text-red-100"
                            : "border border-gray-300 bg-white text-gray-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                      }`}
                    >
                      <span className="sr-only">{mine ? `You sent, ${time}: ` : m.error ? `AI error, ${time}: ` : `AI replied, ${time}: `}</span>
                      {m.text}
                    </div>
                    {m.error && m.retryOf && m.id === lastErrorId && (
                      <button
                        type="button"
                        onClick={() => retry(m)}
                        disabled={loading}
                        className="mt-1 rounded-lg border border-red-700 px-3 py-1 text-xs font-semibold text-red-900 hover:bg-red-100 disabled:opacity-60 dark:border-red-400 dark:text-red-200 dark:hover:bg-red-950"
                      >
                        Retry
                      </button>
                    )}
                    {!mine && !m.error && m.source && (
                      <p className="mt-0.5 text-[11px] text-gray-600 dark:text-zinc-400">
                        {m.source === "ai" ? "Answered by AI using ShopNGo live data" : "Basic catalogue answer (AI is busy, please try again)"}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2">
                <AiAvatar id={aiAvatar} size={32} />
                <p className="rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200">
                  <span className="sr-only">AI: </span>
                  Thinking
                  <span aria-hidden="true" className="ml-0.5 motion-safe:animate-pulse">…</span>
                </p>
              </div>
            )}
          </div>

          <p className="sr-only" role="status" aria-live="polite">{announce}</p>

          <div className="border-t border-gray-300 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-900">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <label htmlFor="ask-input" className="sr-only">
                  Your message. Enter sends, Shift plus Enter adds a new line.
                </label>
                <textarea
                  id="ask-input"
                  ref={inputRef}
                  value={text}
                  rows={2}
                  maxLength={1000}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (hint) setHint("");
                  }}
                  onKeyDown={(e) => {
                    if (shouldSendOnKey({ key: e.key, shiftKey: e.shiftKey, isComposing: e.nativeEvent.isComposing })) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Ask anything…"
                  aria-describedby="ask-help"
                  className="block w-full resize-none rounded-lg border border-gray-400 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-600 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700 dark:border-zinc-500 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400"
                />
              </div>
              <button
                type="button"
                onClick={() => send()}
                disabled={loading}
                className="h-10 shrink-0 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                Send
              </button>
            </div>
            <p id="ask-help" className="mt-1 text-xs text-gray-600 dark:text-zinc-400">
              Enter to send, Shift+Enter for a new line.{" "}
              <Link href="/account#avatars" className="font-medium text-teal-800 underline dark:text-teal-300" onClick={() => setOpen(false)}>
                Change avatars
              </Link>
            </p>
            {hint && (
              <p role="alert" className="mt-1 text-xs font-medium text-red-800 dark:text-red-300">
                {hint}
              </p>
            )}
          </div>
        </div>
      )}

      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-teal-800 px-4 py-3 font-semibold text-white shadow-xl hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
        aria-expanded={open}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12a8.96 8.96 0 01-4.06 7.5A8.97 8.97 0 0112 21a8.96 8.96 0 01-4.94-1.5L3 21l1.5-4.06A8.96 8.96 0 013 12a8.97 8.97 0 011.5-4.94A8.96 8.96 0 0112 3a9 9 0 019 9z" />
        </svg>
        <span className="hidden text-sm sm:inline" aria-hidden="true">Ask AI</span>
      </button>
    </div>
  );
}
