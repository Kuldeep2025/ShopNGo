import Link from "next/link";
import { compareForListing } from "@/features/compare/priceCompareDb";
import type { Comparison, RankedOffer } from "@/features/compare/priceCompare";

const money = (n: number, c: string) => (c === "INR" ? `₹ ${n.toLocaleString("en-IN")}` : `${c} ${n}`);

function Table({ caption, cmp, currentId }: { caption: string; cmp: Comparison; currentId: string }) {
  const slugCount = new Map<string, number>();
  cmp.ranked.forEach((o) => slugCount.set(o.slug, (slugCount.get(o.slug) ?? 0) + 1));
  const href = (o: RankedOffer) => `/products/${(slugCount.get(o.slug) ?? 0) > 1 ? o.id : o.slug}`;
  const label = (o: RankedOffer) => {
    const tags: string[] = [];
    if (cmp.cheapest && o.id === cmp.cheapest.id) tags.push("Cheapest");
    if (cmp.bestValue && o.id === cmp.bestValue.id && cmp.count > 1) tags.push("Best value");
    if (o.id === currentId) tags.push("This page");
    return tags;
  };
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
        <caption className="mb-2 text-left text-sm text-gray-600">{caption}</caption>
        <thead>
          <tr className="border-b border-gray-300 text-gray-700">
            <th scope="col" className="py-2 pr-3 font-semibold">Store</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Product</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Price</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Stock</th>
            <th scope="col" className="py-2 font-semibold">Rating</th>
          </tr>
        </thead>
        <tbody>
          {cmp.ranked.map((o) => (
            <tr key={o.id} className="border-b border-gray-200 align-top">
              <th scope="row" className="py-2 pr-3 font-medium text-gray-900">
                <Link href={`/stores/${o.storeSlug}`} className="text-teal-800 hover:underline">{o.storeName}</Link>
                {label(o).map((t) => (
                  <span key={t} className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${t === "Cheapest" ? "bg-emerald-100 text-emerald-900" : t === "Best value" ? "bg-amber-100 text-amber-900" : "bg-gray-100 text-gray-800"}`}>
                    {t}
                  </span>
                ))}
              </th>
              <td className="py-2 pr-3">
                {o.id === currentId ? o.title : <Link href={href(o)} className="text-teal-800 hover:underline">{o.title}</Link>}
              </td>
              <td className="py-2 pr-3 font-semibold text-gray-900">{money(o.price, o.currency)}</td>
              <td className="py-2 pr-3">{o.inStock ? (o.stock === null ? "Available" : o.stock <= 5 ? `Only ${o.stock} left` : "In stock") : "Out of stock"}</td>
              <td className="py-2">{o.reviewCount > 0 && o.rating !== null ? `${o.rating.toFixed(1)} out of 5 (${o.reviewCount} ${o.reviewCount === 1 ? "review" : "reviews"})` : "No reviews yet"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "Compare prices from other stores": the same item across stores, plus similar items, cheapest labelled. */
export async function PriceComparison({ listingId }: { listingId: string }) {
  let data: Awaited<ReturnType<typeof compareForListing>> = null;
  try {
    data = await compareForListing(listingId);
  } catch {
    data = null;
  }
  if (!data) return null;
  const { same, similar, base } = data;
  const others = same.stores > 1;
  return (
    <section className="mt-14" aria-labelledby="compare-heading">
      <h2 id="compare-heading" className="text-xl font-bold text-gray-900">Compare prices from other stores</h2>
      {others ? (
        <>
          <p className="mt-1 text-sm text-gray-700" role="status">
            {same.count} stores sell this item. The cheapest is {same.cheapest?.storeName} at {money(same.cheapest!.price, base.currency)}.
            {same.savings > 0 ? ` You can save ${money(same.savings, base.currency)} (${same.savingsPercent}%) compared with the highest price.` : ""}
            {same.bestValue ? ` Best value, weighing price against rating: ${same.bestValue.storeName}.` : ""}
          </p>
          <Table caption="Same product, ranked from the lowest price to the highest" cmp={same} currentId={base.id} />
        </>
      ) : (
        <p className="mt-1 text-sm text-gray-700">No other store sells this exact item right now.</p>
      )}
      {similar.count > 0 && (
        <div className="mt-6">
          <h3 className="text-base font-semibold text-gray-900">Similar items you may also like</h3>
          <p className="text-sm text-gray-600">These are close matches, not the same product.</p>
          <Table caption="Similar items from the same category, cheapest first" cmp={{ ...similar, ranked: similar.ranked.slice(0, 6) }} currentId={base.id} />
        </div>
      )}
    </section>
  );
}
