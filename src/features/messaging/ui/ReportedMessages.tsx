"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/identity/AuthProvider";
import { Button } from "@/components/ui";
import { apiCall } from "@/lib/client/api";

type Report = {
  id: string;
  reason: string | null;
  createdAt: string;
  reporter: string;
  product: string;
  store: string;
  message: { id: string; body: string; senderRole: string; author: string; createdAt: string };
  earlier: { id: string; body: string; senderRole: string; createdAt: string }[];
};

/** Reported messages for moderators. Only messages a member has reported appear here, with two earlier messages for context. */
export function ReportedMessages() {
  const { getIdToken } = useAuth();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const res = await apiCall<{ reports: Report[] }>(getIdToken, "/api/moderator/message-reports");
    if (res.ok) setReports(res.data.reports);
  }, [getIdToken]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  async function resolve(id: string) {
    const res = await apiCall(getIdToken, `/api/moderator/message-reports/${id}`, { method: "POST" });
    setNote(res.ok ? "Report marked as handled." : res.data.error ?? "Could not update the report.");
    await load();
  }

  return (
    <section aria-labelledby="msgreports" className="mt-10">
      <h2 id="msgreports" className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
        Reported messages{reports ? ` (${reports.length})` : ""}
      </h2>
      <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400">Conversations are private. You only see a message when a member reports it.</p>
      <p role="status" aria-live="polite" className="sr-only">{note}</p>
      <ul className="mt-2 space-y-3">
        {reports && reports.length === 0 && <li className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">No reported messages.</li>}
        {reports?.map((r) => (
          <li key={r.id} className="rounded-xl border border-gray-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="font-medium text-gray-900 dark:text-zinc-100">
              {r.product}, {r.store}. Reported by {r.reporter}.
            </p>
            {r.reason && <p className="mt-1 text-gray-700 dark:text-zinc-300">Reason: {r.reason}</p>}
            {r.earlier.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-zinc-400" aria-label="Earlier messages">
                {r.earlier.map((e) => (
                  <li key={e.id}>{e.senderRole === "SELLER" ? "Seller" : "Customer"}: {e.body}</li>
                ))}
              </ul>
            )}
            <p className="mt-2 rounded-lg bg-amber-50 p-2 text-gray-900 dark:bg-amber-950 dark:text-zinc-100">
              Reported message from {r.message.author} ({r.message.senderRole === "SELLER" ? "seller" : "customer"}): {r.message.body}
            </p>
            <Button className="mt-2" size="sm" variant="outline" onClick={() => resolve(r.id)}>
              Mark as handled
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
