"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/identity/AuthProvider";
import { Alert, Badge, Button, Textarea } from "@/components/ui";
import { apiCall } from "@/lib/client/api";
import { MAX_MESSAGE_LENGTH } from "../rules";

type Msg = { id: string; body: string; fromMe: boolean; senderRole: string; createdAt: string; reported: boolean };
type Thread = {
  conversation: { id: string; side: "CUSTOMER" | "SELLER"; topicLabel: string; product: string; productSlug: string | null; storeName: string; customerName: string; orderId: string | null; orderRef: string | null };
  messages: Msg[];
  state: { canSend: boolean; paused: boolean; reason: string | null; phase: string };
};

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** One conversation: messages (announced politely when new ones arrive), a reply box, and a Report button. Refreshes every 20 seconds. */
export function ChatThread({ conversationId, onChanged }: { conversationId: string; onChanged?: () => void }) {
  const { getIdToken } = useAuth();
  const [thread, setThread] = useState<Thread | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const seen = useRef<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const load = useCallback(async () => {
    const res = await apiCall<Thread>(getIdToken, `/api/conversations/${conversationId}`);
    if (!res.ok) {
      setError(res.data.error ?? "Could not load this conversation.");
      return;
    }
    setError(null);
    setThread(res.data);
    const count = res.data.messages.length;
    if (seen.current !== null && count > seen.current) {
      const fresh = res.data.messages.slice(seen.current).filter((m) => !m.fromMe);
      if (fresh.length) setAnnounce(`${fresh.length} new message${fresh.length > 1 ? "s" : ""}. ${fresh[fresh.length - 1]!.body}`);
    }
    seen.current = count;
    onChanged?.();
  }, [getIdToken, conversationId, onChanged]);

  useEffect(() => {
    seen.current = null;
    setThread(null);
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (thread) headingRef.current?.focus();
    // Move focus to the conversation heading only when a different conversation opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread?.conversation.id]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !body.trim()) return;
    setBusy(true);
    setNote(null);
    const res = await apiCall(getIdToken, `/api/conversations/${conversationId}/messages`, { method: "POST", body: { body } });
    setBusy(false);
    if (!res.ok) {
      setNote(res.data.error ?? "Your message could not be sent.");
      await load();
      return;
    }
    setBody("");
    setAnnounce("Message sent.");
    await load();
  }

  async function report(id: string) {
    const reason = window.prompt("Why are you reporting this message? (optional, up to 300 characters)") ?? null;
    if (reason === null) return;
    const res = await apiCall(getIdToken, `/api/messages/${id}/report`, { method: "POST", body: { reason: reason.slice(0, 300) } });
    setNote(res.ok ? "Thank you. A moderator will look at this message." : res.data.error ?? "Could not report this message.");
    if (res.ok) await load();
  }

  if (error && !thread) return <Alert variant="error">{error}</Alert>;
  if (!thread) return <p className="text-sm text-gray-600" role="status">Loading conversation</p>;
  const c = thread.conversation;
  const seller = c.side === "SELLER";

  return (
    <section aria-labelledby="chat-h" className="space-y-3">
      <div>
        <h2 id="chat-h" ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
          {seller ? `${c.customerName} about ${c.product}` : `${c.storeName} about ${c.product}`}
        </h2>
        <p className="text-sm text-gray-600 dark:text-zinc-400">
          <Badge variant="info">{c.topicLabel}</Badge>
          {c.orderRef ? ` Order ${c.orderRef}.` : " Question before buying."}
          {!seller && c.orderId && (
            <>
              {" "}
              <a className="text-teal-700 underline dark:text-teal-400" href={`/orders/${c.orderId}`}>Open the order</a>
            </>
          )}
        </p>
      </div>

      <ol aria-label="Messages" className="space-y-2">
        {thread.messages.map((m) => (
          <li key={m.id} className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${m.fromMe ? "ml-auto bg-teal-50 text-gray-900 dark:bg-teal-950 dark:text-zinc-100" : "bg-gray-100 text-gray-900 dark:bg-zinc-800 dark:text-zinc-100"}`}>
            <p className="text-xs font-medium text-gray-600 dark:text-zinc-400">
              {m.fromMe ? "You" : m.senderRole === "SELLER" ? c.storeName : c.customerName}, {when(m.createdAt)}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words">{m.body}</p>
            {!m.fromMe && (
              <button
                type="button"
                onClick={() => report(m.id)}
                disabled={m.reported}
                aria-label={m.reported ? "You reported this message" : `Report this message from ${m.senderRole === "SELLER" ? c.storeName : c.customerName}`}
                className="mt-1 text-xs text-gray-600 underline hover:text-red-700 disabled:no-underline dark:text-zinc-400"
              >
                {m.reported ? "Reported" : "Report"}
              </button>
            )}
          </li>
        ))}
      </ol>

      <div className="sr-only" role="status" aria-live="polite">{announce}</div>

      {thread.state.paused && (
        <Alert variant="warning" title="Messaging is paused">
          {thread.state.reason}
        </Alert>
      )}
      {!thread.state.canSend && !thread.state.paused && thread.state.reason && <Alert variant="info">{thread.state.reason}</Alert>}
      {note && <p role="status" className="text-sm text-gray-800 dark:text-zinc-200">{note}</p>}

      {thread.state.canSend && (
        <form onSubmit={send} className="space-y-2">
          <label htmlFor="reply-box" className="block text-sm font-medium text-gray-800 dark:text-zinc-200">
            {seller ? "Your reply" : "Your message"}
          </label>
          <Textarea id="reply-box" rows={3} maxLength={MAX_MESSAGE_LENGTH} value={body} onChange={(e) => setBody(e.target.value)} aria-describedby="reply-count" />
          <p id="reply-count" className="text-xs text-gray-500 dark:text-zinc-400">{body.length} of {MAX_MESSAGE_LENGTH} characters.</p>
          <Button type="submit" loading={busy} disabled={!body.trim()}>
            {seller ? "Send reply" : "Send"}
          </Button>
        </form>
      )}
    </section>
  );
}
