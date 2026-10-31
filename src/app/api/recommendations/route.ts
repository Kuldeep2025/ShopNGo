import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { filterPublicListings, toPublicListingDTO } from "@/features/catalogue";
import { DEMO_LISTINGS } from "@/lib/demo-data";
import { frequentlyBoughtTogether, popularItems, similarItems, toBaskets } from "@/features/analytics";
import { loadTransactions } from "@/features/analytics/dataSource";
import { listingIdForSlug, publicListingsByIds } from "@/features/analytics/server";

/**
 * GET /api/recommendations            – best sellers mined from order history
 * GET /api/recommendations?slug=<s>   – "customers also bought" for one product
 *   (association rules blended with item-to-item collaborative filtering)
 * Falls back to the previous demo / recently-added behaviour when mining has nothing.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.trim();
  try {
    const { transactions, source } = await loadTransactions();
    if (slug) {
      const listingId = await listingIdForSlug(slug, source);
      if (listingId) {
        const scores = new Map<string, number>();
        for (const r of frequentlyBoughtTogether(toBaskets(transactions), listingId, 6, { minSupport: 0.01, minConfidence: 0.05 })) {
          scores.set(r.consequent[0], (scores.get(r.consequent[0]) ?? 0) + 0.6 * Math.min(1, r.confidence));
        }
        for (const s of similarItems(transactions, listingId, 6)) {
          scores.set(s.listingId, (scores.get(s.listingId) ?? 0) + 0.4 * s.score);
        }
        const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
        const listings = await publicListingsByIds(ranked.map(([id]) => id), source);
        if (listings.length > 0) {
          return NextResponse.json({
            recommendations: listings.map((l) => ({
              ...l,
              reason: "Customers who bought this also bought",
              score: Math.round((scores.get(l.id) ?? 0) * 1000) / 1000,
            })),
            source: `mined-${source}`,
          });
        }
      }
    } else {
      const ranked = popularItems(transactions, 6);
      const listings = await publicListingsByIds(ranked.map((r) => r.listingId), source);
      if (listings.length > 0) {
        return NextResponse.json({
          recommendations: listings.map((l) => ({ ...l, reason: "Best seller on ShopNGo" })),
          source: `mined-${source}`,
        });
      }
    }
  } catch {
    // fall through to the non-personalised fallback below
  }
  return fallback();
}

async function fallback() {
  const demo = (source: string) =>
    NextResponse.json({
      recommendations: DEMO_LISTINGS.slice(0, 6).map((l) => ({ ...l, reason: "Popular on ShopNGo" })),
      source,
    });
  if (!isDatabaseConfigured() || !prisma) return demo("demo");
  try {
    const listings = await prisma.listing.findMany({
      where: { status: "APPROVED", store: { isActive: true } },
      include: {
        store: { select: { id: true, name: true, slug: true, isActive: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    const visible = filterPublicListings(listings);
    if (visible.length === 0) return demo("demo-fallback");
    return NextResponse.json({
      recommendations: visible.map((l) => ({ ...toPublicListingDTO(l), reason: "Recently added" })),
      source: "database",
    });
  } catch {
    return demo("demo-fallback");
  }
}
