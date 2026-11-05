"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getListingImageUrl, getListingImageAlt } from "@/features/catalogue/media";
import { recHeaders } from "@/features/recommendations/track";
import { useAuth } from "@/features/identity/AuthProvider";
import type { Rec } from "./PickCard";
import { PriceTag } from "@/features/pricing/PriceTag";

/** "Similar products / Customers also viewed" for a product page. Renders nothing when there is nothing to show. */
export function SimilarProducts({ listingId }: { listingId: string }) {
  const { loading, getIdToken } = useAuth();
  const [recs, setRecs] = useState<Rec[]>([]);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/recommendations/similar?product=${encodeURIComponent(listingId)}`, { headers: await recHeaders(getIdToken) });
        if (!res.ok) return;
        const data = (await res.json()) as { recommendations?: Rec[] };
        if (!cancelled) setRecs((data.recommendations ?? []).slice(0, 6));
      } catch {
        /* section stays hidden */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId, loading, getIdToken]);

  if (recs.length === 0) return null;
  return (
    <section className="mt-14" aria-labelledby="similar-heading">
      <h2 id="similar-heading" className="text-xl font-semibold text-gray-900 dark:text-zinc-100">
        Similar products and customers also viewed
      </h2>
      <ul className="mt-5 flex snap-x gap-4 overflow-x-auto pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600" tabIndex={0} aria-label="Similar products, scroll sideways for more">
        {recs.map((l) => {
          const img = getListingImageUrl(l);
          return (
            <li key={l.id} className="w-48 shrink-0 snap-start">
              <Link
                href={`/products/${l.slug}`}
                className="block h-full overflow-hidden rounded-2xl border border-gray-200 bg-white hover:border-teal-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-zinc-800 dark:bg-zinc-900"
              >
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={getListingImageAlt(l)} loading="lazy" className="aspect-square w-full bg-gray-50 object-cover" />
                ) : (
                  <div className="aspect-square w-full bg-teal-50 dark:bg-zinc-800" aria-hidden="true" />
                )}
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-medium text-gray-900 dark:text-zinc-100">{l.title}</p>
                  <PriceTag size="sm" price={l.price} currency={l.currency} strikePrice={l.pricing?.strikePrice} percentOff={l.pricing?.percentOff} saleEndsAt={l.pricing?.saleEndsAt} showEnd={false} />
                  {l.reason && <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400">{l.reason}</p>}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
