import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { filterPublicListings, toPublicListingDTO } from "@/features/catalogue";

/**
 * GET /api/recommendations/personal – "Picked for you" for the signed-in customer.
 * Signals: categories and stores of past purchases and of items they rated 4 or 5 stars.
 * Items they already bought are left out; items they rated 1 or 2 stars lower their category.
 * Without history, returns the best-rated popular items so the row is never empty.
 */
export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured() || !prisma) {
    return NextResponse.json({ recommendations: [], personalised: false });
  }
  try {
    const user = await getSessionUser(req.headers.get("authorization"));
    const include = {
      store: { select: { id: true, name: true, slug: true, isActive: true } },
      category: { select: { id: true, name: true, slug: true } },
    } as const;

    const catWeight = new Map<string, number>();
    const storeWeight = new Map<string, number>();
    const owned = new Set<string>();
    const reasonByCat = new Map<string, string>();

    if (user) {
      const [items, reviews] = await Promise.all([
        prisma.orderItem.findMany({
          where: { order: { customerId: user.id, status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } } },
          select: { listingId: true, listing: { select: { categoryId: true, storeId: true, category: { select: { name: true } } } } },
          take: 200,
        }),
        prisma.review.findMany({
          where: { userId: user.id },
          select: { rating: true, listingId: true, listing: { select: { categoryId: true, storeId: true, category: { select: { name: true } } } } },
          take: 200,
        }),
      ]);
      for (const it of items) {
        owned.add(it.listingId);
        const c = it.listing.categoryId;
        if (c) {
          catWeight.set(c, (catWeight.get(c) ?? 0) + 2);
          if (it.listing.category) reasonByCat.set(c, `Because you bought from ${it.listing.category.name}`);
        }
        storeWeight.set(it.listing.storeId, (storeWeight.get(it.listing.storeId) ?? 0) + 1);
      }
      for (const r of reviews) {
        const delta = r.rating >= 4 ? 3 : r.rating <= 2 ? -4 : 0;
        const c = r.listing.categoryId;
        if (c && delta) {
          catWeight.set(c, (catWeight.get(c) ?? 0) + delta);
          if (delta > 0 && r.listing.category) reasonByCat.set(c, `Because you rated ${r.listing.category.name} highly`);
        }
        if (delta > 0) storeWeight.set(r.listing.storeId, (storeWeight.get(r.listing.storeId) ?? 0) + 2);
      }
    }

    const topCats = [...catWeight.entries()].filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c]) => c);
    let rows: Awaited<ReturnType<typeof prisma.listing.findMany<{ include: typeof include }>>> = [];
    if (topCats.length > 0) {
      rows = await prisma.listing.findMany({
        where: {
          status: "APPROVED",
          store: { isActive: true },
          categoryId: { in: topCats },
          id: { notIn: [...owned] },
        },
        include,
        orderBy: { createdAt: "desc" },
        take: 60,
      });
    }

    // Best-rated items give a quality signal and fill the row when history is thin.
    const rated = await prisma.review.groupBy({
      by: ["listingId"],
      _avg: { rating: true },
      _count: { rating: true },
      orderBy: { _avg: { rating: "desc" } },
      take: 40,
    });
    const avg = new Map(rated.map((r) => [r.listingId, r._avg.rating ?? 0]));

    const scored = rows
      .map((l) => ({
        l,
        score:
          (l.categoryId ? catWeight.get(l.categoryId) ?? 0 : 0) +
          (storeWeight.get(l.storeId) ?? 0) * 0.5 +
          (avg.get(l.id) ?? 0),
      }))
      .sort((a, b) => b.score - a.score);

    // Spread across categories so the row is varied, not twelve of the same thing.
    const picked: typeof rows = [];
    const perCat = new Map<string, number>();
    for (const s of scored) {
      const c = s.l.categoryId ?? "none";
      if ((perCat.get(c) ?? 0) >= 3) continue;
      perCat.set(c, (perCat.get(c) ?? 0) + 1);
      picked.push(s.l);
      if (picked.length >= 8) break;
    }
    const personalised = picked.length > 0;

    if (picked.length < 8) {
      const ids = rated.map((r) => r.listingId).filter((id) => !owned.has(id) && !picked.some((p) => p.id === id));
      const extra = ids.length
        ? await prisma.listing.findMany({ where: { id: { in: ids }, status: "APPROVED", store: { isActive: true } }, include })
        : [];
      const order = new Map(ids.map((id, i) => [id, i]));
      extra.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      picked.push(...extra.slice(0, 8 - picked.length));
    }
    if (picked.length < 8) {
      const more = await prisma.listing.findMany({
        where: { status: "APPROVED", store: { isActive: true }, id: { notIn: [...owned, ...picked.map((p) => p.id)] } },
        include,
        orderBy: { createdAt: "desc" },
        take: 8 - picked.length,
      });
      picked.push(...more);
    }

    const visible = filterPublicListings(picked);
    return NextResponse.json({
      personalised,
      recommendations: visible.map((l) => ({
        ...toPublicListingDTO(l),
        reason:
          (l.categoryId && reasonByCat.get(l.categoryId) && catWeight.get(l.categoryId)! > 0
            ? reasonByCat.get(l.categoryId)
            : null) ?? (avg.get(l.id) ? "Highly rated by customers" : "New on ShopNGo"),
      })),
    });
  } catch (err) {
    console.error("personal recs error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ recommendations: [], personalised: false });
  }
}
