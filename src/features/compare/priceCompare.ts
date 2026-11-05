/**
 * Price comparison across stores. Pure functions only (no database), so they are easy to test.
 * Same product = same normalised name once colours, sizes and the " - variant" suffix are ignored
 * (the mall catalogue builds titles as "Brand Series Noun - Variant"). Close matches in the same
 * category (high word overlap) are reported separately as "similar", never as the same item.
 */

export type Offer = {
  id: string;
  title: string;
  slug: string;
  storeName: string;
  storeSlug: string;
  price: number;
  currency: string;
  stock: number | null;
  categoryId: string | null;
  rating: number | null;
  reviewCount: number;
};

export type Match = "same" | "similar";

const COLOURS = new Set([
  "black", "white", "red", "blue", "green", "yellow", "pink", "purple", "orange", "grey", "gray", "brown", "beige",
  "navy", "maroon", "silver", "golden", "gold", "cream", "teal", "olive", "multicolour", "multicolor",
]);
const SIZES = new Set(["xs", "s", "m", "l", "xl", "xxl", "xxxl", "small", "medium", "large", "size", "free"]);

/** Lower-case words of a title that identify the model: variant suffix, colours and sizes removed. */
export function titleTokens(title: string): string[] {
  const base = title.split(/\s[-–—]\s/)[0] ?? title;
  return base
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !COLOURS.has(t) && !SIZES.has(t) && !/^\d+(cm|mm|inch|in)$/.test(t));
}

/** Stable key: the same product always gives the same key whatever its colour or size. */
export function productKey(title: string): string {
  return titleTokens(title).join(" ");
}

/** Word overlap between two titles from 0 to 1. */
export function titleSimilarity(a: string, b: string): number {
  const x = new Set(titleTokens(a));
  const y = new Set(titleTokens(b));
  if (x.size === 0 || y.size === 0) return 0;
  let both = 0;
  for (const t of x) if (y.has(t)) both += 1;
  return both / (x.size + y.size - both);
}

export const SIMILAR_THRESHOLD = 0.6;

export function classifyMatch(base: Pick<Offer, "title" | "categoryId">, other: Pick<Offer, "title" | "categoryId">): Match | null {
  if (productKey(base.title) === productKey(other.title) && productKey(base.title) !== "") return "same";
  const sameCategory = base.categoryId !== null && base.categoryId === other.categoryId;
  if (sameCategory && titleSimilarity(base.title, other.title) >= SIMILAR_THRESHOLD) return "similar";
  return null;
}

export type RankedOffer = Offer & { rank: number; inStock: boolean; match?: Match };

export type Comparison = {
  count: number;
  stores: number;
  ranked: RankedOffer[];
  cheapest: RankedOffer | null;
  highest: RankedOffer | null;
  /** Highest price minus lowest price among offers that can be bought now. */
  savings: number;
  savingsPercent: number;
  bestValue: RankedOffer | null;
};

const inStock = (o: Offer) => o.stock === null || o.stock > 0;

/** Rating pulled towards 3.5 when there are few reviews, so one 5-star review does not win. */
export function adjustedRating(o: Pick<Offer, "rating" | "reviewCount">): number {
  const n = o.reviewCount;
  const avg = o.rating ?? 3.5;
  return (avg * n + 3.5 * 3) / (n + 3);
}

/** Ranks offers by price (cheapest first, ties: in stock, then better rating). */
export function compareOffers(offers: Offer[]): Comparison {
  const sorted = [...offers].sort(
    (a, b) =>
      a.price - b.price ||
      Number(inStock(b)) - Number(inStock(a)) ||
      (b.rating ?? 0) - (a.rating ?? 0) ||
      a.storeName.localeCompare(b.storeName)
  );
  const ranked: RankedOffer[] = sorted.map((o, i) => ({ ...o, rank: i + 1, inStock: inStock(o) }));
  const buyable = ranked.filter((o) => o.inStock);
  const cheapest = buyable[0] ?? ranked[0] ?? null;
  const highest = buyable.length ? buyable[buyable.length - 1]! : (ranked[ranked.length - 1] ?? null);
  const savings = cheapest && highest ? Math.max(0, Math.round((highest.price - cheapest.price) * 100) / 100) : 0;
  const savingsPercent = highest && highest.price > 0 ? Math.round((savings / highest.price) * 1000) / 10 : 0;

  // Best value: adjusted rating divided by the square root of the price premium over the cheapest.
  let bestValue: RankedOffer | null = null;
  if (buyable.length && cheapest) {
    const floor = Math.max(cheapest.price, 1);
    let bestScore = -1;
    for (const o of buyable) {
      const score = adjustedRating(o) / Math.sqrt(Math.max(o.price, 1) / floor);
      if (score > bestScore + 1e-9) {
        bestScore = score;
        bestValue = o;
      }
    }
  }
  return {
    count: ranked.length,
    stores: new Set(ranked.map((o) => o.storeSlug)).size,
    ranked,
    cheapest,
    highest,
    savings,
    savingsPercent,
    bestValue,
  };
}

/** Splits candidate offers into the same product (other stores) and similar items, then ranks each. */
export function compareWithProduct(base: Offer, candidates: Offer[]): {
  same: Comparison;
  similar: Comparison;
} {
  const same: Offer[] = [base];
  const similar: Offer[] = [];
  const marks = new Map<string, Match>();
  for (const c of candidates) {
    if (c.id === base.id) continue;
    const m = classifyMatch(base, c);
    if (m === "same") {
      same.push(c);
      marks.set(c.id, m);
    } else if (m === "similar") {
      similar.push(c);
      marks.set(c.id, m);
    }
  }
  const tag = (cmp: Comparison, m: Match): Comparison => ({
    ...cmp,
    ranked: cmp.ranked.map((o) => ({ ...o, match: o.id === base.id ? "same" : m })),
  });
  return { same: tag(compareOffers(same), "same"), similar: tag(compareOffers(similar), "similar") };
}

/** Groups offers from a search by product key, products on sale in several stores first. */
export function groupByProduct(offers: Offer[]): { key: string; name: string; comparison: Comparison }[] {
  const map = new Map<string, Offer[]>();
  for (const o of offers) {
    const k = productKey(o.title) || o.id;
    map.set(k, [...(map.get(k) ?? []), o]);
  }
  return [...map.entries()]
    .map(([key, list]) => ({ key, name: list[0]!.title.split(/\s[-–—]\s/)[0]!, comparison: compareOffers(list) }))
    .sort(
      (a, b) =>
        b.comparison.stores - a.comparison.stores ||
        (a.comparison.cheapest?.price ?? 0) - (b.comparison.cheapest?.price ?? 0)
    );
}

const money = (n: number, c = "INR") => (c === "INR" ? `Rs ${n}` : `${c} ${n}`);

export function describeOffer(o: RankedOffer): string {
  const rating = o.reviewCount > 0 && o.rating !== null ? `rated ${o.rating.toFixed(1)} from ${o.reviewCount} reviews` : "no reviews yet";
  return `${o.storeName}: ${money(o.price, o.currency)}, ${o.inStock ? (o.stock !== null ? `${o.stock} in stock` : "available") : "out of stock"}, ${rating}`;
}

/** Plain-text evidence block for the AI. Honest when only one store sells the item. */
export function comparisonEvidence(name: string, same: Comparison, similar?: Comparison): string {
  const lines: string[] = [`PRICE COMPARISON for ${name}:`];
  if (same.stores <= 1) {
    lines.push("Only one store sells this exact item right now, so there is no other store price to compare.");
    if (same.ranked[0]) lines.push(describeOffer(same.ranked[0]));
  } else {
    same.ranked.forEach((o, i) => lines.push(`${i + 1}. ${describeOffer(o)}`));
    if (same.cheapest) lines.push(`Cheapest: ${same.cheapest.storeName} at ${money(same.cheapest.price, same.cheapest.currency)}.`);
    lines.push(`Saving against the highest price: ${money(same.savings)} (${same.savingsPercent}%).`);
    if (same.bestValue) lines.push(`Best value (price against rating): ${same.bestValue.storeName}.`);
  }
  if (similar && similar.count > 0) {
    lines.push("Similar items (not the exact same product), cheapest first:");
    similar.ranked.slice(0, 4).forEach((o) => lines.push(`- ${o.title}, ${describeOffer(o)}`));
  }
  return lines.join("\n");
}
