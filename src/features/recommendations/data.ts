import { prisma } from "@/lib/db";
import { toPublicListingDTO, type PublicListingDTO } from "@/features/catalogue";
import {
  buildCooccurrence,
  buildProfile,
  rank,
  similarProducts,
  type Cooccurrence,
  type Item,
  type Profile,
  type Recommendation,
  type Signal,
} from "./engine";
import { TtlCache } from "./cache";

/**
 * Server side data access for the recommendation engine.
 * Keeps database work small for the free tier: a bounded candidate pool, shared
 * global statistics cached for 5 minutes and per-shopper results cached for 60 seconds.
 */

const PAID = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;
const DAY = 86_400_000;
const POOL_VISIBLE = {
  status: "APPROVED" as const,
  store: { isActive: true },
  OR: [{ productType: { not: "PHYSICAL" as const } }, { stock: null }, { stock: { gt: 0 } }],
};
const include = {
  store: { select: { id: true, name: true, slug: true, isActive: true } },
  category: { select: { id: true, name: true, slug: true, parentId: true, parent: { select: { slug: true } } } },
} as const;

type Row = NonNullable<Awaited<ReturnType<typeof findOneRow>>>;
async function findOneRow(id: string) {
  return prisma!.listing.findUnique({ where: { id }, include });
}

export type Actor = { userId: string | null; anonId: string | null };

export const actorKey = (a: Actor) => (a.userId ? `u:${a.userId}` : `a:${a.anonId ?? "none"}`);

export function toItem(row: Row, stats?: { avg: number; count: number }, trend = 0): Item {
  const brand = (row.attributes as { brand?: unknown } | null)?.brand;
  return {
    id: row.id,
    title: row.title,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? "General",
    categorySlug: row.category?.slug ?? "general",
    parentId: row.category?.parentId ?? null,
    parentSlug: row.category?.parent?.slug ?? null,
    storeId: row.storeId,
    storeName: row.store.name,
    brand: typeof brand === "string" ? brand : null,
    price: Number(row.price.toString()),
    inStock: row.productType !== "PHYSICAL" || row.stock == null || row.stock > 0,
    avgRating: stats?.avg ?? 0,
    ratingCount: stats?.count ?? 0,
    createdAt: row.createdAt.getTime(),
    trend,
  };
}

// ---------- global statistics (shared across shoppers) ----------

type Globals = { cooc: Cooccurrence; trend: Map<string, number>; topIds: string[]; at: number };
let globals: Globals | null = null;
let globalsLoading: Promise<Globals> | null = null;

async function loadGlobals(): Promise<Globals> {
  if (globals && Date.now() - globals.at < 5 * 60_000) return globals;
  if (globalsLoading) return globalsLoading;
  globalsLoading = (async () => {
    const db = prisma!;
    const since60 = new Date(Date.now() - 60 * DAY);
    const since14 = new Date(Date.now() - 14 * DAY);
    const since3 = new Date(Date.now() - 3 * DAY);
    const [orderRows, interRows, trendInter, trendOrders, top] = await Promise.all([
      db.orderItem.findMany({
        where: { order: { status: { in: [...PAID] } } },
        select: { orderId: true, listingId: true },
        orderBy: { id: "desc" },
        take: 8000,
      }),
      db.userInteraction.findMany({
        where: { type: { in: ["VIEW", "CART", "LIKE"] }, productRef: { not: null }, createdAt: { gte: since60 } },
        select: { userId: true, anonId: true, productRef: true },
        orderBy: { createdAt: "desc" },
        take: 8000,
      }),
      db.userInteraction.groupBy({
        by: ["productRef"],
        where: { productRef: { not: null }, type: { in: ["VIEW", "CART", "LIKE"] }, createdAt: { gte: since3 } },
        _count: { _all: true },
        orderBy: { _count: { productRef: "desc" } },
        take: 80,
      }),
      db.orderItem.groupBy({
        by: ["listingId"],
        where: { order: { status: { in: [...PAID] }, createdAt: { gte: since14 } } },
        _count: { _all: true },
        orderBy: { _count: { listingId: "desc" } },
        take: 80,
      }),
      db.review.groupBy({ by: ["listingId"], _count: { _all: true }, orderBy: { _count: { listingId: "desc" } }, take: 150 }),
    ]);

    const baskets = new Map<string, string[]>();
    for (const r of orderRows) {
      const k = `o:${r.orderId}`;
      (baskets.get(k) ?? baskets.set(k, []).get(k)!).push(r.listingId);
    }
    for (const r of interRows) {
      if (!r.productRef) continue;
      const k = `i:${r.userId ?? r.anonId ?? "x"}`;
      (baskets.get(k) ?? baskets.set(k, []).get(k)!).push(r.productRef);
    }
    const trendRaw = new Map<string, number>();
    for (const t of trendInter) if (t.productRef) trendRaw.set(t.productRef, (trendRaw.get(t.productRef) ?? 0) + t._count._all);
    for (const t of trendOrders) trendRaw.set(t.listingId, (trendRaw.get(t.listingId) ?? 0) + t._count._all * 2);
    const max = Math.max(1, ...trendRaw.values());
    const trend = new Map([...trendRaw].map(([k, v]) => [k, Math.min(1, v / max)]));

    const g: Globals = {
      cooc: buildCooccurrence([...baskets.values()]),
      trend,
      topIds: top.map((t) => t.listingId),
      at: Date.now(),
    };
    globals = g;
    return g;
  })().finally(() => {
    globalsLoading = null;
  });
  return globalsLoading;
}

async function ratingStats(ids: string[]): Promise<Map<string, { avg: number; count: number }>> {
  if (!ids.length) return new Map();
  const rows = await prisma!.review.groupBy({ by: ["listingId"], where: { listingId: { in: ids } }, _avg: { rating: true }, _count: { _all: true } });
  return new Map(rows.map((r) => [r.listingId, { avg: r._avg.rating ?? 0, count: r._count._all }]));
}

// ---------- the shopper's own signals ----------

export type Signals = { signals: Signal[]; productIds: Set<string>; cartIds: Set<string> };

export async function loadSignals(actor: Actor): Promise<Signals> {
  const db = prisma!;
  const since = new Date(Date.now() - 90 * DAY);
  const who = [
    ...(actor.userId ? [{ userId: actor.userId }] : []),
    ...(actor.anonId ? [{ anonId: actor.anonId }] : []),
  ];
  const signals: Signal[] = [];
  const productIds = new Set<string>();
  const cartIds = new Set<string>();

  const [inter, orders, reviews, cart] = await Promise.all([
    who.length
      ? db.userInteraction.findMany({ where: { OR: who, createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 700 })
      : Promise.resolve([]),
    actor.userId
      ? db.orderItem.findMany({
          where: { order: { customerId: actor.userId, status: { in: [...PAID] } } },
          select: { listingId: true, order: { select: { createdAt: true } } },
          orderBy: { id: "desc" },
          take: 300,
        })
      : Promise.resolve([]),
    actor.userId
      ? db.review.findMany({ where: { userId: actor.userId }, select: { listingId: true, rating: true, createdAt: true }, take: 200 })
      : Promise.resolve([]),
    actor.userId
      ? db.cart.findUnique({ where: { userId: actor.userId }, select: { updatedAt: true, items: { select: { listingId: true } } } })
      : Promise.resolve(null),
  ]);

  for (const i of inter) {
    signals.push({
      kind: i.type,
      at: i.createdAt.getTime(),
      productId: i.productRef ?? undefined,
      query: i.query ?? undefined,
      weight: i.type === "VIEW" ? i.weight : undefined,
    });
    if (i.productRef) productIds.add(i.productRef);
  }
  for (const o of orders) {
    signals.push({ kind: "PURCHASE", at: o.order.createdAt.getTime(), productId: o.listingId });
    productIds.add(o.listingId);
  }
  for (const r of reviews) {
    signals.push({ kind: "REVIEW", at: r.createdAt.getTime(), productId: r.listingId, rating: r.rating });
    productIds.add(r.listingId);
  }
  if (cart) {
    for (const c of cart.items) {
      signals.push({ kind: "CART", at: cart.updatedAt.getTime(), productId: c.listingId });
      cartIds.add(c.listingId);
      productIds.add(c.listingId);
    }
  }
  return { signals, productIds, cartIds };
}

// ---------- candidates ----------

async function fetchCandidates(profile: Profile, g: Globals, extraIds: string[], categorySlug?: string): Promise<Row[]> {
  const db = prisma!;
  if (categorySlug) {
    return db.listing.findMany({
      where: { ...POOL_VISIBLE, category: { OR: [{ slug: categorySlug }, { parent: { slug: categorySlug } }] } },
      include,
      orderBy: { createdAt: "desc" },
      take: 300,
    });
  }
  const topCats = [...profile.categories].filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c]) => c);
  const topParents = [...profile.parents].filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
  const trendIds = [...g.trend].sort((a, b) => b[1] - a[1]).slice(0, 60).map(([k]) => k);
  const cfIds = [...profile.seeds].sort((a, b) => b[1] - a[1]).slice(0, 8).flatMap(([s]) => g.cooc.neighbors(s, 20).map((n) => n.id));
  const ids = [...new Set([...g.topIds, ...trendIds, ...cfIds, ...extraIds])].slice(0, 400);

  const [byIds, inCats, adjacent, newest] = await Promise.all([
    ids.length ? db.listing.findMany({ where: { ...POOL_VISIBLE, id: { in: ids } }, include }) : Promise.resolve([]),
    topCats.length
      ? db.listing.findMany({ where: { ...POOL_VISIBLE, categoryId: { in: topCats } }, include, orderBy: { createdAt: "desc" }, take: 160 })
      : Promise.resolve([]),
    topParents.length
      ? db.listing.findMany({ where: { ...POOL_VISIBLE, category: { parentId: { in: topParents } } }, include, orderBy: { createdAt: "desc" }, take: 120 })
      : Promise.resolve([]),
    db.listing.findMany({ where: POOL_VISIBLE, include, orderBy: { createdAt: "desc" }, take: 80 }),
  ]);
  const seen = new Map<string, Row>();
  for (const r of [...byIds, ...inCats, ...adjacent, ...newest]) if (!seen.has(r.id)) seen.set(r.id, r);
  return [...seen.values()];
}

// ---------- public entry points ----------

export type RankedFeed = {
  personalised: boolean;
  ranked: Recommendation[];
  dtos: Map<string, PublicListingDTO>;
  liked: Set<string>;
};

const feedCache = new TtlCache<RankedFeed>(60_000, 300);

export function invalidateFeed(actor: Actor) {
  feedCache.delete(`${actorKey(actor)}|`);
  if (actor.userId && actor.anonId) feedCache.delete(`a:${actor.anonId}|`);
}

export async function personalFeed(actor: Actor, category?: string): Promise<RankedFeed> {
  const key = `${actorKey(actor)}|${category ?? ""}`;
  const cached = feedCache.get(key);
  if (cached) return cached;
  const db = prisma!;
  const now = Date.now();
  const [g, sig] = await Promise.all([loadGlobals(), loadSignals(actor)]);

  // Products the shopper touched are loaded too, so their category, brand and price can be learned.
  const touched = await db.listing.findMany({ where: { id: { in: [...sig.productIds].slice(0, 400) } }, include });
  const touchedStats = await ratingStats(touched.map((t) => t.id));
  const itemsById = new Map<string, Item>();
  for (const t of touched) itemsById.set(t.id, toItem(t, touchedStats.get(t.id), g.trend.get(t.id) ?? 0));
  const profile = buildProfile(sig.signals, itemsById, now);

  const rows = await fetchCandidates(profile, g, [], category);
  const stats = await ratingStats(rows.map((r) => r.id));
  const candidates: Item[] = [];
  const dtos = new Map<string, PublicListingDTO>();
  for (const r of rows) {
    const it = toItem(r, stats.get(r.id), g.trend.get(r.id) ?? 0);
    candidates.push(it);
    itemsById.set(r.id, it);
    dtos.set(r.id, toPublicListingDTO(r));
  }
  // Items sitting in the cart are not suggested again.
  const ranked = rank(candidates, profile, itemsById, {
    limit: 60,
    now,
    exclude: sig.cartIds,
    cooc: g.cooc,
    seed: new Date(now).toISOString().slice(0, 10),
  });
  const feed: RankedFeed = { personalised: profile.positiveMass > 0, ranked, dtos, liked: profile.liked };
  feedCache.set(key, feed);
  return feed;
}

export type SimilarResult = { recs: (Recommendation & { dto: PublicListingDTO })[] };

const similarCache = new TtlCache<SimilarResult>(5 * 60_000, 300);

export async function similarFor(productRef: string, dismissed: Set<string>): Promise<SimilarResult> {
  const hit = similarCache.get(productRef);
  if (hit && dismissed.size === 0) return hit;
  const db = prisma!;
  const now = Date.now();
  const g = await loadGlobals();
  const target = await db.listing.findFirst({ where: { OR: [{ id: productRef }, { slug: productRef }] }, include });
  if (!target) return { recs: [] };
  const neighbours = g.cooc.neighbors(target.id, 24).map((n) => n.id);
  const [near, rest] = await Promise.all([
    neighbours.length ? db.listing.findMany({ where: { ...POOL_VISIBLE, id: { in: neighbours } }, include }) : Promise.resolve([]),
    db.listing.findMany({
      where: {
        ...POOL_VISIBLE,
        id: { not: target.id },
        ...(target.categoryId ? { categoryId: target.categoryId } : {}),
      },
      include,
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ]);
  const seen = new Map<string, Row>();
  for (const r of [...near, ...rest]) seen.set(r.id, r);
  const stats = await ratingStats([...seen.keys(), target.id]);
  const items = [...seen.values()].map((r) => toItem(r, stats.get(r.id), g.trend.get(r.id) ?? 0));
  const recs = similarProducts(toItem(target, stats.get(target.id)), items, g.cooc, { limit: 8, dismissed, now });
  const out: SimilarResult = {
    recs: recs.map((r) => ({ ...r, dto: toPublicListingDTO(seen.get(r.id)!) })),
  };
  if (dismissed.size === 0) similarCache.set(productRef, out);
  return out;
}

export async function dismissedFor(actor: Actor): Promise<Set<string>> {
  const who = [
    ...(actor.userId ? [{ userId: actor.userId }] : []),
    ...(actor.anonId ? [{ anonId: actor.anonId }] : []),
  ];
  if (!who.length) return new Set();
  const rows = await prisma!.userInteraction.findMany({ where: { OR: who, type: "DISMISS", productRef: { not: null } }, select: { productRef: true }, take: 500 });
  return new Set(rows.map((r) => r.productRef!));
}
