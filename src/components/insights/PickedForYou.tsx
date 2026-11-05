"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/identity/AuthProvider";
import { apiCall } from "@/lib/client/api";
import { getListingImageUrl, getListingImageAlt } from "@/features/catalogue/media";
import type { PublicListingDTO } from "@/features/catalogue";

type Rec = PublicListingDTO & { reason?: string };

/** "Picked for you": personalised for signed-in customers, best-rated picks for everyone else. */
export function PickedForYou() {
  const { appUser, firebaseUser, loading, getIdToken } = useAuth();
  const [recs, setRecs] = useState<Rec[]>([]);
  const [personalised, setPersonalised] = useState(false);
  const signedIn = Boolean(appUser || firebaseUser);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    (async () => {
      const res = await apiCall<{ recommendations?: Rec[]; personalised?: boolean }>(
        getIdToken,
        "/api/recommendations/personal"
      );
      if (cancelled || !res.ok) return;
      setRecs(res.data.recommendations ?? []);
      setPersonalised(Boolean(res.data.personalised));
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, signedIn, getIdToken]);

  if (recs.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-labelledby="pfy-heading">
      <h2 id="pfy-heading" className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
        {personalised ? "Picked for you" : "Customers love these"}
      </h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
        {personalised
          ? "Based on what you bought and how you rated things."
          : signedIn
            ? "Buy and rate a few products and this row will start matching your taste."
            : "Sign in, buy and rate products to get suggestions made for you."}
      </p>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {recs.map((l) => (
          <li key={l.id}>
            <Link
              href={`/products/${l.slug}`}
              className="group block h-full overflow-hidden rounded-2xl border border-gray-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-teal-400 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-zinc-800 dark:bg-zinc-900"
            >
              {getListingImageUrl(l) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getListingImageUrl(l) as string}
                  alt={getListingImageAlt(l)}
                  loading="lazy"
                  className="aspect-square w-full bg-gray-50 object-cover transition duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              ) : (
                <div className="aspect-square w-full bg-teal-50 dark:bg-zinc-800" aria-hidden="true" />
              )}
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-medium text-gray-900 dark:text-zinc-100">{l.title}</p>
                <p className="mt-1 text-sm font-semibold text-teal-800 dark:text-teal-300">
                  {l.currency === "INR" ? `₹ ${l.price}` : `${l.currency} ${l.price}`}
                </p>
                {l.reason && <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">{l.reason}</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
