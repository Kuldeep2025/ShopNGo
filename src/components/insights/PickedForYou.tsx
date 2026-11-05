"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/identity/AuthProvider";
import { recHeaders, track, untrack } from "@/features/recommendations/track";
import { PickCard, type Rec } from "./PickCard";

/** "Picked for you": a scrollable row on the home page. Learns from what the shopper does. */
export function PickedForYou() {
  const { appUser, firebaseUser, loading, getIdToken } = useAuth();
  const [recs, setRecs] = useState<Rec[]>([]);
  const [personalised, setPersonalised] = useState(false);
  const [announce, setAnnounce] = useState("");
  const signedIn = Boolean(appUser || firebaseUser);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/recommendations/personal?limit=10", { headers: await recHeaders(getIdToken), cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { recommendations?: Rec[]; personalised?: boolean };
        if (cancelled) return;
        setRecs(data.recommendations ?? []);
        setPersonalised(Boolean(data.personalised));
      } catch {
        /* the row simply stays hidden */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, signedIn, getIdToken]);

  const dismiss = useCallback(
    (rec: Rec) => {
      setRecs((prev) => prev.filter((r) => r.id !== rec.id));
      setAnnounce(`${rec.title} removed. We will show fewer products like this.`);
      void track({ type: "DISMISS", productRef: rec.id }, getIdToken);
    },
    [getIdToken]
  );

  const toggleLike = useCallback(
    (rec: Rec) => {
      const next = !rec.liked;
      setRecs((prev) => prev.map((r) => (r.id === rec.id ? { ...r, liked: next } : r)));
      setAnnounce(next ? `${rec.title} saved. We will show more like it.` : `${rec.title} removed from saved.`);
      if (next) void track({ type: "LIKE", productRef: rec.id }, getIdToken);
      else void untrack(rec.id, "LIKE", getIdToken);
    },
    [getIdToken]
  );

  if (recs.length === 0 && !announce) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-labelledby="pfy-heading">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="pfy-heading" className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
            {personalised ? "Picked for you" : "Customers love these"}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
            {personalised
              ? "Based on what you bought, saved, searched and looked at. Tap Not interested to see less of something."
              : signedIn
                ? "Look around, save things and buy a few products, and this row will start matching your taste."
                : "Sign in so your picks improve; you can clear your history from your account."}
          </p>
        </div>
        <Link
          href="/for-you"
          className="rounded-lg px-3 py-2 text-sm font-semibold text-teal-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:text-teal-300"
        >
          See more picks
        </Link>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
      <ul
        className="mt-5 flex snap-x gap-4 overflow-x-auto pb-3 motion-safe:scroll-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        tabIndex={0}
        aria-label="Picked for you, scroll sideways for more"
      >
        {recs.map((l) => (
          <li key={l.id} className="w-56 shrink-0 snap-start sm:w-60">
            <PickCard rec={l} onDismiss={dismiss} onToggleLike={toggleLike} />
          </li>
        ))}
      </ul>
    </section>
  );
}
