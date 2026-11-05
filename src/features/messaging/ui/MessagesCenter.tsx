"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/features/identity/AuthProvider";
import { Alert, Badge, Spinner } from "@/components/ui";
import { SignInRequired } from "@/components/feedback/SignInRequired";
import { apiCall } from "@/lib/client/api";
import { ChatThread } from "./ChatThread";

type Row = {
  id: string;
  topicLabel: string;
  product: string;
  storeName: string;
  customerName: string;
  orderRef: string | null;
  unread: number;
  lastMessageAt: string;
  lastMessage: { body: string; fromMe: boolean } | null;
};

/** Inbox for customers (/messages) and sellers (/seller/inbox). Conversations are grouped by person and product or order. */
export function MessagesCenter({ as }: { as: "customer" | "seller" }) {
  const { appUser, loading: authLoading, getIdToken } = useAuth();
  const initial = useSearchParams().get("c");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(initial);
  const seller = as === "seller";

  const load = useCallback(async () => {
    const res = await apiCall<{ conversations: Row[]; unread: number }>(getIdToken, `/api/conversations?as=${as}`);
    if (res.ok) {
      setRows(res.data.conversations);
      setUnread(res.data.unread ?? 0);
      setError(null);
    } else setError(res.data.error ?? "Could not load your messages.");
  }, [getIdToken, as]);

  useEffect(() => {
    if (authLoading || !appUser) return;
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [authLoading, appUser, load]);

  if (authLoading) return <div className="flex min-h-[40vh] items-center justify-center"><Spinner size="lg" label="Loading" /></div>;
  if (!appUser) return <SignInRequired title="Sign in to see your messages" />;

  // Group by person (seller view) or store (customer view).
  const groups = new Map<string, Row[]>();
  for (const r of rows ?? []) {
    const key = seller ? r.customerName : r.storeName;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">{seller ? "Inbox" : "Messages"}</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400" role="status" aria-live="polite">
        {rows === null ? "Loading" : unread > 0 ? `${unread} unread message${unread > 1 ? "s" : ""}.` : "No unread messages."} This page refreshes every 20 seconds.
      </p>
      {error && <Alert variant="error" className="mt-4">{error}</Alert>}
      {rows && rows.length === 0 && (
        <p className="mt-6 text-sm text-gray-700 dark:text-zinc-300">
          {seller ? "No customer has written to your store yet." : "You have no conversations yet. To ask a seller something, open a product and use Message the seller, or open an order."}
        </p>
      )}
      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,18rem)_1fr]">
        <nav aria-label="Conversations" className="space-y-4">
          {[...groups.entries()].map(([name, list]) => (
            <section key={name} aria-label={name}>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{name}</h2>
              <ul className="mt-1 space-y-1">
                {list.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setOpen(r.id)}
                      aria-current={open === r.id ? "true" : undefined}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${open === r.id ? "border-teal-600 bg-teal-50 dark:bg-teal-950" : "border-gray-200 bg-white hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900"}`}
                    >
                      <span className="block font-medium text-gray-900 dark:text-zinc-100">
                        {r.product}
                        {r.unread > 0 && (
                          <span className="ml-2"><Badge variant="warning">{r.unread} unread</Badge></span>
                        )}
                      </span>
                      <span className="block text-xs text-gray-600 dark:text-zinc-400">
                        {r.topicLabel}{r.orderRef ? `, order ${r.orderRef}` : ", before buying"}
                      </span>
                      {r.lastMessage && (
                        <span className="mt-1 block truncate text-xs text-gray-700 dark:text-zinc-300">
                          {r.lastMessage.fromMe ? "You: " : ""}{r.lastMessage.body}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>
        <div>{open ? <ChatThread conversationId={open} onChanged={load} /> : rows && rows.length > 0 && <p className="text-sm text-gray-600 dark:text-zinc-400">Choose a conversation to read it.</p>}</div>
      </div>
    </div>
  );
}
