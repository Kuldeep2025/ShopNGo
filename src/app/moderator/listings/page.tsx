"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/identity/AuthProvider";
import { Alert, Badge, Button, FormField, Spinner, Textarea } from "@/components/ui";
import { SignInRequired } from "@/components/feedback/SignInRequired";
import { apiCall, formatMoney } from "@/lib/client/api";

type Row = {
  id: string;
  title: string;
  description: string | null;
  price: string;
  currency: string;
  productType: string;
  store: { name: string };
};

export default function ModeratorListingsPage() {
  const { appUser, loading: authLoading, getIdToken } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  const isModerator = !!appUser && (appUser.roles.includes("MODERATOR") || appUser.roles.includes("ADMIN"));

  const load = useCallback(async () => {
    const res = await apiCall<{ listings?: Row[] }>(getIdToken, "/api/moderator/listings?status=SUBMITTED");
    if (res.ok) setRows(res.data.listings ?? []);
    else setError(res.data.error ?? "Could not load listings.");
    setLoading(false);
  }, [getIdToken]);

  useEffect(() => {
    if (authLoading) return;
    if (!isModerator) {
      setLoading(false);
      return;
    }
    load();
  }, [authLoading, isModerator, load]);

  async function decide(listingId: string, title: string, decision: "APPROVED" | "REJECTED") {
    const r = reason[listingId]?.trim();
    if (!r || r.length < 3) {
      setError("Please write a reason of at least 3 characters.");
      return;
    }
    setError(null);
    setActing(listingId);
    const res = await apiCall(getIdToken, "/api/moderator/listings", {
      method: "PATCH",
      body: { listingId, decision, reason: r },
    });
    setActing(null);
    if (!res.ok) {
      setError(res.data.error ?? "Could not save the decision.");
      return;
    }
    setNotice(`${title} was ${decision === "APPROVED" ? "approved" : "rejected"}.`);
    await load();
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" label="Loading listings" />
      </div>
    );
  }
  if (!appUser) return <SignInRequired title="Sign in as a moderator" />;
  if (!isModerator) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Moderators only</h1>
        <p className="mt-2 text-gray-600">Your account does not have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Review product listings</h1>
      <p className="mt-1 text-sm text-gray-600">
        <Link href="/moderator/applications" className="text-teal-700 underline">
          Seller applications
        </Link>
      </p>
      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}
      <p role="status" aria-live="polite" className="mt-4 text-sm text-emerald-800">
        {notice}
      </p>
      {rows.length === 0 ? (
        <p className="mt-8 text-gray-500">No listings are waiting for review.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {rows.map((l) => (
            <li key={l.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="font-semibold text-gray-900">{l.title}</h2>
              <p className="text-sm text-gray-600">
                {l.store.name} <Badge variant="default">{l.productType}</Badge> {formatMoney(l.price, l.currency)}
              </p>
              {l.description && <p className="mt-2 text-sm text-gray-700">{l.description}</p>}
              <div className="mt-3">
                <FormField label="Reason for your decision" required>
                  {({ id, describedBy }) => (
                    <Textarea
                      id={id}
                      aria-describedby={describedBy}
                      rows={2}
                      value={reason[l.id] ?? ""}
                      onChange={(e) => setReason((p) => ({ ...p, [l.id]: e.target.value }))}
                    />
                  )}
                </FormField>
              </div>
              <div className="mt-3 flex gap-3">
                <Button loading={acting === l.id} onClick={() => decide(l.id, l.title, "APPROVED")}>
                  Approve
                </Button>
                <Button variant="danger" disabled={acting === l.id} onClick={() => decide(l.id, l.title, "REJECTED")}>
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
