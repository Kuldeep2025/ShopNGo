/**
 * Extra PRODUCT EVIDENCE for the shopping assistant: price comparison across stores and a
 * summary of every review. Built only from the database, so answers stay grounded.
 */
import { comparisonEvidence } from "@/features/compare/priceCompare";
import { compareForListing, compareForQuery } from "@/features/compare/priceCompareDb";
import { reviewEvidence } from "@/features/reviews/analyse";
import { loadReviewSummary } from "@/features/reviews/analyseDb";

const COMPARE = /cheap|compar|sasta|sasti|\bprice|\bcost|kimat|kitn|\bvs\b|versus|lowest|expensive|mehenga|deal|saving|which store|kaun si|konsi|different (store|shop|seller)/i;
const REVIEWS = /review|rating|rated|\bstars?\b|feedback|quality|good or bad|worth|achh?a|kaisa|kaisi|recommend|complain|problem|durab|reliab|opinion|people say|log kya/i;

export function detectIntent(question: string): { compare: boolean; reviews: boolean } {
  return { compare: COMPARE.test(question), reviews: REVIEWS.test(question) };
}

const rs = (n: number) => `Rs ${n}`;

export async function buildExtraEvidence(question: string, listingId?: string): Promise<string[]> {
  const intent = detectIntent(question);
  if (!intent.compare && !intent.reviews && !listingId) return [];
  const out: string[] = [];
  const reviewIds: { id: string; name: string }[] = [];

  if (listingId) {
    const c = await compareForListing(listingId);
    if (c) {
      const name = c.base.title.split(/\s[-–—]\s/)[0]!;
      const summary = c.same.stores > 1
        ? `${name} is sold by ${c.same.stores} stores. Cheapest: ${c.same.cheapest?.storeName} at ${rs(c.same.cheapest!.price)}, saving ${rs(c.same.savings)} against the highest price.`
        : `Only one store sells ${name} right now, so there is no other store price to compare.`;
      out.push(`Summary: ${summary}\n${comparisonEvidence(name, c.same, c.similar)}`);
      reviewIds.push({ id: c.base.id, name });
    }
  } else if (intent.compare || intent.reviews) {
    const c = await compareForQuery(question);
    if (c && c.groups.length > 0) {
      const groups = c.groups.slice(0, intent.compare ? 3 : 2);
      for (const g of groups) {
        const cmp = g.comparison;
        if (intent.compare) {
          const summary = cmp.stores > 1
            ? `${g.name} is sold by ${cmp.stores} stores. Cheapest: ${cmp.cheapest?.storeName} at ${rs(cmp.cheapest!.price)}, saving ${rs(cmp.savings)} against the highest price.`
            : `${g.name}: only ${cmp.cheapest?.storeName} sells it, at ${rs(cmp.cheapest!.price)}.`;
          out.push(`Summary: ${summary}\n${comparisonEvidence(g.name, cmp)}`);
        }
        if (cmp.cheapest) reviewIds.push({ id: cmp.cheapest.id, name: g.name });
      }
      if (intent.compare && c.cheapestOverall && c.groups.length > 1) {
        const o = c.cheapestOverall;
        out.push(`Summary: Cheapest match for "${question.slice(0, 60)}" is ${o.title} at ${o.storeName} for ${rs(o.price)}.\nCHEAPEST MATCH OVERALL: ${o.title}, ${o.storeName}, ${rs(o.price)}, ${o.inStock ? "in stock" : "out of stock"}. These are different products, not the same item.`);
      }
    }
  }

  if (intent.reviews || listingId) {
    for (const r of reviewIds.slice(0, 3)) {
      const s = await loadReviewSummary(r.id);
      if (!s) continue;
      const headline = s.count === 0 ? `${r.name} has no reviews yet.` : `${r.name}: average ${s.average} out of 5 from ${s.count} review${s.count === 1 ? "" : "s"}${s.few ? " (a small sample)" : ""}.`;
      out.push(`Summary: ${headline}\n${reviewEvidence(r.name, s)}`);
    }
  }
  return out.slice(0, 5);
}
