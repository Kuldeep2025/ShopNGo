"use client";

import { useId, useState } from "react";
import { useAuth } from "@/features/identity/AuthProvider";
import { Alert, Button, Textarea } from "@/components/ui";
import { apiCall } from "@/lib/client/api";
import { MAX_MESSAGE_LENGTH } from "../rules";

type Topic = { value: string; label: string };

/** Starts a conversation with a seller. Used on the product page and the order page. */
export function MessageComposer({
  listingId,
  orderItemId,
  topics,
  heading,
  onSent,
}: {
  listingId?: string;
  orderItemId?: string;
  topics?: Topic[];
  heading: string;
  onSent?: (conversationId: string) => void;
}) {
  const { getIdToken } = useAuth();
  const uid = useId();
  const [topic, setTopic] = useState(topics?.[0]?.value ?? "");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await apiCall<{ conversationId?: string }>(getIdToken, "/api/conversations", {
      method: "POST",
      body: { listingId, orderItemId, topic: topics ? topic : undefined, body },
    });
    setBusy(false);
    if (!res.ok || !res.data.conversationId) {
      setError(res.data.error ?? "Your message could not be sent. Please try again.");
      return;
    }
    setBody("");
    setSent(res.data.conversationId);
    onSent?.(res.data.conversationId);
  }

  return (
    <form onSubmit={send} className="mt-3 space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900" aria-label={heading}>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{heading}</h3>
      {topics && (
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-topic`} className="block text-sm font-medium text-gray-800 dark:text-zinc-200">
            What is this about?
          </label>
          <select
            id={`${uid}-topic`}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            {topics.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="space-y-1.5">
        <label htmlFor={`${uid}-body`} className="block text-sm font-medium text-gray-800 dark:text-zinc-200">
          Your message
        </label>
        <Textarea id={`${uid}-body`} required rows={4} maxLength={MAX_MESSAGE_LENGTH} value={body} onChange={(e) => setBody(e.target.value)} aria-describedby={`${uid}-count`} />
        <p id={`${uid}-count`} className="text-xs text-gray-500 dark:text-zinc-400">
          {body.length} of {MAX_MESSAGE_LENGTH} characters. The seller will not see your phone number.
        </p>
      </div>
      <div role="status" aria-live="polite">
        {error && <Alert variant="error">{error}</Alert>}
        {sent && !error && (
          <Alert variant="success">
            Message sent to the seller. You can read replies on the <a className="underline" href={`/messages?c=${sent}`}>Messages page</a>.
          </Alert>
        )}
      </div>
      <Button type="submit" loading={busy} disabled={!body.trim()}>
        Send message
      </Button>
    </form>
  );
}
