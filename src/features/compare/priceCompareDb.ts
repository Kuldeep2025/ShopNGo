/** Database side of price comparison: loads offers (with ratings) for the pure helpers. */
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { compareWithProduct, groupByProduct, compareOffers, titleTokens, type Offer } from "./priceCompare";

type Row = {
  id: string;
  title: string;
  slug: string;
  price: unknown;
  currency: string;
  stock: number | null;
  categoryId: string | null;
  store: { name: string; slug: string };
};

async function withRatings(rows: Row[]): Promise<Offer[]> {
  if (!prisma || rows.length === 0) return [];
  const groups = await prisma.review.groupBy({
    by: ["listingId"],
    where: { listingId: { in: rows.map((r) => r.id) } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const byId = new Map(groups.map((g) => [g.listingId, g]));
  return rows.map((r) => {
    const g = byId.get(r.id);
    return {
      id: r.id,
      title: r.title,
      slug: r.slug,
      storeName: r.store.name,
      storeSlug: r.store.slug,
      price: Number(r.price),
      currency: r.currency,
      stock: r.stock,
      categoryId: r.categoryId,
      rating: g?._avg.rating != null ? Math.round(g._avg.rating * 10) / 10 : null,
      reviewCount: g?._count.rating ?? 0,
    };
  });
}

const visible = { status: "APPROVED" as const, store: { isActive: true } };
const select = {
  id: true, title: true, slug: true, price: true, currency: true, stock: true, categoryId: true,
  store: { select: { name: true, slug: true } },
};

/** Same product in other stores plus similar items, for one listing id. Null when the listing is not public. */
export async function compareForListing(listingId: string) {
  if (!isDatabaseConfigured() || !prisma) return null;
  const baseRow = await prisma.listing.findFirst({ where: { id: listingId, ...visible }, select });
  if (!baseRow) return null;
  const tokens = titleTokens(baseRow.title).slice(0, 3);
  // Candidates: same category, or sharing the first words of the title (the brand and line).
  const candidateRows = await prisma.listing.findMany({
    where: {
      ...visible,
      id: { not: baseRow.id },
      OR: [
        ...(baseRow.categoryId ? [{ categoryId: baseRow.categoryId }] : []),
        ...(tokens.length ? [{ AND: tokens.map((t) => ({ title: { contains: t, mode: "insensitive" as const } })) }] : []),
      ],
    },
    select,
    take: 600,
  });
  const offers = await withRatings([baseRow, ...candidateRows]);
  const base = offers[0]!;
  return { base, ...compareWithProduct(base, offers.slice(1)) };
}

const STOP = new Set([
  "the", "and", "for", "which", "what", "cheaper", "cheapest", "cheap", "compare", "comparison", "price", "prices", "from",
  "store", "stores", "best", "lowest", "least", "sasta", "sabse", "kaun", "kon", "sa", "se", "ka", "ki", "ke", "hai", "kya",
  "shop", "sell", "sells", "buy", "where", "vs", "versus", "than", "with", "are", "does", "any", "about", "one", "please", "mujhe", "batao",
]);

export function searchWords(q: string): string[] {
  return q.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !STOP.has(t)).slice(0, 5);
}

/** Offers matching a free-text query, grouped by product, products sold by several stores first. */
export async function compareForQuery(q: string) {
  if (!isDatabaseConfigured() || !prisma) return null;
  const words = searchWords(q);
  if (words.length === 0) return { query: q, groups: [], cheapestOverall: null, offers: 0 };
  const run = (ws: string[]) =>
    prisma!.listing.findMany({
      where: { ...visible, AND: ws.map((w) => ({ title: { contains: w, mode: "insensitive" as const } })) },
      select,
      take: 300,
    });
  let rows = await run(words);
  // Fewer words if the full phrase matches nothing (for example a store name in the question).
  for (let n = words.length - 1; rows.length === 0 && n >= 1; n--) rows = await run(words.slice(0, n));
  const offers = await withRatings(rows);
  const groups = groupByProduct(offers);
  const cheapestOverall = compareOffers(offers).cheapest;
  return { query: q, groups: groups.slice(0, 12), cheapestOverall, offers: offers.length };
}
