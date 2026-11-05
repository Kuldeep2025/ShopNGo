"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/identity/AuthProvider";
import { recHeaders, resetInteractions, track, untrack } from "@/features/recommendations/track";
import { Button } from "@/components/ui";
import { PickCard, type Rec } from "./PickCard";

type Feed = { recommendations?: Rec[]; personalised?: boolean; hasMore?: boolean; nextOffset?: number };
type Cat = { id: string; name: string; slug: string };

const PAGE = 12;

/** Full personalised feed with category chips and a "Load more" button (no automatic scrolling). */
export function ForYouFeed() {
  const { appUser, firebaseUser, loading, getIdToken } = useAuth();
  const signedIn = Boolean(appUser || firebaseUser);
  const [cats, setCats] = useState<Cat[]>([]);
  const [category, setCategory] = useState("");
  const [recs, setRecs] = useState<Rec[]>([]);
  const [personalised, setPersonalised] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [version, setVersion] = useState(0);
  const dismissed = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCats((d?.categories ?? []).map((c: Cat) => ({ id: c.id, name: c.name, slug: c.slug }))))
      .catch(() => undefined);
  }, []);

  const load = useCallback(
    async (from: number, replace: boolean) => {
      setBusy(true);
      setFailed(false);
      try {
        const qs = new URLSearchParams({ limit: String(PAGE), offset: String(from) });
        if (category) qs.set("category", category);
        const res = await fetch(`/api/recommendations/personal?${qs}`, { headers: await recHeaders(getIdToken), cache: "no-store" });
        if (!res.ok) throw new Error("bad");
        const data = (await res.json()) as Feed;
        const fresh = (data.recommendations ?? []).filter((r) => !dismissed.current.has(r.id));
        setRecs((prev) => (replace ? fresh : [...prev, ...fresh.filter((f) => !prev.some((p) => p.id === f.id))]));
        setPersonalised(Boolean(data.personalised));
        setHasMore(Boolean(data.hasMore));
        setOffset(data.nextOffset ?? from + fresh.length);
        setStatus(replace ? `${fresh.length} picks shown.` : `${fresh.length} more picks loaded.`);
      } catch {
        setFailed(true);
      } finally {
        setBusy(false);
      }
    },
    [category, getIdToken]
  );

  useEffect(() => {
    if (loading) return;
    void load(0, true);
  }, [loading, signedIn, category, version, load]);

  const dismiss = (rec: Rec) => {
    dismissed.current.add(rec.id);
    setRecs((prev) => prev.filter((r) => r.id !== rec.id));
    setStatus(`${rec.title} removed. We will show fewer products like this.`);
    void track({ type: "DISMISS", productRef: rec.id }, getIdToken);
  };
  const toggleLike = (rec: Rec) => {
    const next = !rec.liked;
    setRecs((prev) => prev.map((r) => (r.id === rec.id ? { ...r, liked: next } : r)));
    setStatus(next ? `${rec.title} saved. We will show more like it.` : `${rec.title} removed from saved.`);
    if (next) void track({ type: "LIKE", productRef: rec.id }, getIdToken);
    else void untrack(rec.id, "LIKE", getIdToken);
  };
  const reset = async () => {
    setConfirmReset(false);
    const ok = await resetInteractions(getIdToken);
    if (ok) {
      dismissed.current.clear();
      setStatus("Your recommendation history has been cleared.");
      setVersion((v) => v + 1);
    } else {
      setStatus("Could not clear your history right now. Please try again.");
    }
  };

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
      active
        ? "border-teal-700 bg-teal-700 text-white"
        : "border-gray-300 bg-white text-gray-800 hover:bg-teal-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
    }`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 sm:text-3xl">For you</h1>
      <p className="mt-1 max-w-2xl text-gray-600 dark:text-zinc-400">
        {personalised
          ? "Picked from what you bought, saved, searched and looked at, plus what similar shoppers liked. Use Not interested to see less of something."
          : signedIn
            ? "Look around, save things and buy a few products, and these picks will start matching your taste. For now these are popular products."
            : "Sign in so your picks improve; you can clear your history from your account. For now these are popular products."}
      </p>
      {!signedIn && !loading && (
        <p className="mt-2 text-sm">
          <Link href="/auth/sign-in" className="font-medium text-teal-800 underline dark:text-teal-300">
            Sign in
          </Link>
        </p>
      )}

      {cats.length > 0 && (
        <nav className="mt-6" aria-label="Filter picks by category">
          <ul className="flex flex-wrap gap-2">
            <li>
              <button type="button" className={chip(category === "")} aria-pressed={category === ""} onClick={() => setCategory("")}>
                All
              </button>
            </li>
            {cats.map((c) => (
              <li key={c.id}>
                <button type="button" className={chip(category === c.slug)} aria-pressed={category === c.slug} onClick={() => setCategory(c.slug)}>
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>

      {failed && (
        <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          Could not load your picks right now. Please try again in a moment.
        </p>
      )}

      {recs.length === 0 && !busy && !failed ? (
        <p className="mt-8 text-gray-700 dark:text-zinc-300">No picks to show here yet. Try another category.</p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recs.map((l) => (
            <li key={l.id}>
              <PickCard rec={l} onDismiss={dismiss} onToggleLike={toggleLike} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 text-center">
        {hasMore ? (
          <Button variant="outline" loading={busy} onClick={() => load(offset, false)}>
            Load more
          </Button>
        ) : (
          recs.length > 0 && !busy && <p className="text-sm text-gray-600 dark:text-zinc-400">That is all the picks for now. Come back after you look around more.</p>
        )}
        {busy && recs.length === 0 && <p className="text-gray-600">Loading your picks</p>}
      </div>

      <section className="mt-12 rounded-2xl border border-gray-200 p-5 dark:border-zinc-800" aria-labelledby="priv-heading">
        <h2 id="priv-heading" className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
          Your data, your control
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
          Picks use your orders, ratings, searches, cart, saves and product views on ShopNGo. You can erase what we learned and start fresh at any time.
        </p>
        {confirmReset ? (
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Confirm reset">
            <Button variant="danger" onClick={reset}>
              Yes, clear my history
            </Button>
            <Button variant="outline" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button className="mt-3" variant="outline" onClick={() => setConfirmReset(true)}>
            Reset my recommendations
          </Button>
        )}
      </section>
    </div>
  );
}
