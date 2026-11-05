import Link from "next/link";
import { frequentlyBoughtTogether, similarItems, toBaskets } from "@/features/analytics";
import { loadTransactions } from "@/features/analytics/dataSource";
import { listingIdForSlug, publicListingsByIds } from "@/features/analytics/server";
import { PriceTag } from "@/features/pricing/PriceTag";

/**
 * Server component: "Frequently bought together" mined from order history
 * (Apriori association rules, with collaborative filtering as a fallback).
 * Renders nothing when there is not enough data.
 */
export async function FrequentlyBoughtTogether({ slug }: { slug: string }) {
  try {
    const { transactions, source } = await loadTransactions();
    const listingId = await listingIdForSlug(slug, source);
    if (!listingId) return null;

    const rules = frequentlyBoughtTogether(toBaskets(transactions), listingId, 3, {
      minSupport: 0.01,
      minConfidence: 0.05,
    });
    const ids = rules.length
      ? rules.map((r) => r.consequent[0])
      : similarItems(transactions, listingId, 3).map((s) => s.listingId);
    const listings = await publicListingsByIds(ids, source);
    if (listings.length === 0) return null;

    return (
      <section className="mt-14" aria-labelledby="fbt-heading">
        <h2 id="fbt-heading" className="text-xl font-semibold text-gray-900">
          Frequently bought together
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Based on what other customers bought in the same order
          {source !== "database" ? " (sample data)" : ""}.
        </p>
        <ul className="mt-5 grid gap-4 sm:grid-cols-3">
          {listings.map((l) => {
            const rule = rules.find((r) => r.consequent[0] === l.id);
            return (
              <li key={l.id}>
                <Link
                  href={`/products/${l.slug}`}
                  className="block h-full rounded-2xl border border-gray-200 p-4 transition hover:border-teal-400 hover:shadow-sm"
                >
                  <p className="font-medium text-gray-900">{l.title}</p>
                  <PriceTag size="sm" price={l.price} currency={l.currency} strikePrice={l.pricing?.strikePrice} percentOff={l.pricing?.percentOff} saleEndsAt={l.pricing?.saleEndsAt} showEnd={false} />
                  {rule && (
                    <p className="mt-2 text-xs text-gray-500">
                      {Math.round(rule.confidence * 100)}% of buyers also chose this · lift {rule.lift.toFixed(2)}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    );
  } catch {
    return null;
  }
}
