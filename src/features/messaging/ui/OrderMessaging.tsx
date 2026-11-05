"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/identity/AuthProvider";
import { Alert, Button } from "@/components/ui";
import { apiCall } from "@/lib/client/api";
import { MessageComposer } from "./MessageComposer";

type Item = {
  orderItemId: string;
  title: string;
  phase: string;
  canMessage: boolean;
  paused: boolean;
  afterDelivery: boolean;
  policy: { returns: string; warranty: string; guarantee: string | null; replacement: string | null; returnWindowEnds: string | null } | null;
  conversations: { id: string; topic: string; customerUnread: number }[];
};
type Data = { pausedText: string; topics: { value: string; label: string }[]; items: Item[] };

/** Per ordered item: message the seller (when allowed), contact the delivery partner (while delivering), seller policy after delivery. */
export function OrderMessaging({ orderId }: { orderId: string }) {
  const { getIdToken } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [openFor, setOpenFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiCall<Data>(getIdToken, `/api/orders/${orderId}/messaging`);
    if (res.ok) setData(res.data);
  }, [getIdToken, orderId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  if (!data || data.items.length === 0) return null;
  const anyDelivering = data.items.some((i) => i.paused);

  return (
    <section aria-labelledby="om-h" className="mt-8">
      <h2 id="om-h" className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Talk to the seller</h2>
      <ul className="mt-2 space-y-3">
        {data.items.map((it) => (
          <li key={it.orderItemId} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">{it.title}</p>

            {it.paused && (
              <Alert variant="warning" className="mt-2">
                {data.pausedText}
              </Alert>
            )}

            {it.afterDelivery && it.policy && (
              <div className="mt-2 text-sm text-gray-800 dark:text-zinc-200">
                <p>Seller policy: {it.policy.returns} {it.policy.warranty}</p>
                {it.policy.returnWindowEnds && <p>Return window ends on {new Date(it.policy.returnWindowEnds).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric" })}.</p>}
                {it.policy.guarantee && <p>Guarantee: {it.policy.guarantee}</p>}
                {it.policy.replacement && <p>Replacement: {it.policy.replacement}</p>}
                <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400">This only shows what the seller has stated. You can still message the seller about any problem.</p>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {it.canMessage && (
                <Button variant="outline" onClick={() => setOpenFor(openFor === it.orderItemId ? null : it.orderItemId)} aria-expanded={openFor === it.orderItemId}>
                  {it.afterDelivery ? "Message seller about an issue" : "Message seller"}
                </Button>
              )}
              {it.paused && (
                <a href="#delivery-partner-contact" className="inline-flex h-10 items-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-zinc-700 dark:text-zinc-200">
                  Contact delivery partner
                </a>
              )}
              {it.conversations.length > 0 && (
                <Link href={`/messages?c=${it.conversations[0]!.id}`} className="inline-flex h-10 items-center text-sm text-teal-700 underline dark:text-teal-400">
                  Open my conversation{it.conversations.some((c) => c.customerUnread > 0) ? " (new reply)" : ""}
                </Link>
              )}
            </div>

            {openFor === it.orderItemId && it.canMessage && (
              <MessageComposer
                orderItemId={it.orderItemId}
                topics={it.afterDelivery ? data.topics : undefined}
                heading={it.afterDelivery ? "Message the seller" : "Message the seller about this order"}
                onSent={() => { load(); }}
              />
            )}
          </li>
        ))}
      </ul>
      {anyDelivering && <p className="mt-2 text-xs text-gray-600 dark:text-zinc-400">The delivery partner&apos;s name and phone number are shown in the Delivery section above, only while your order is being delivered.</p>}
    </section>
  );
}
