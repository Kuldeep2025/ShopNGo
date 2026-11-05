/** Chat history helpers for the Ask ShopNGo panel (kept in sessionStorage). */
export type ChatMessage = {
  id: string;
  role: "user" | "ai";
  text: string;
  /** ISO time */
  ts: string;
  source?: "ai" | "fallback" | null;
  /** AI message that is a failure notice; retryOf is the question to send again. */
  error?: boolean;
  retryOf?: string;
};

export const CHAT_KEY = "shopngo_ai_chat_v1";
export const CHAT_OPEN_KEY = "shopngo_ai_chat_open";
export const MAX_STORED = 60;

export function parseChat(raw: string | null): ChatMessage[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (m): m is ChatMessage =>
          m && typeof m.id === "string" && (m.role === "user" || m.role === "ai") && typeof m.text === "string" && typeof m.ts === "string"
      )
      .slice(-MAX_STORED);
  } catch {
    return [];
  }
}

export function serializeChat(messages: ChatMessage[]): string {
  return JSON.stringify(messages.slice(-MAX_STORED));
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Enter sends; Shift+Enter makes a new line; Enter while composing (IME) does nothing. */
export function shouldSendOnKey(e: { key: string; shiftKey: boolean; isComposing?: boolean }): boolean {
  return e.key === "Enter" && !e.shiftKey && !e.isComposing;
}
