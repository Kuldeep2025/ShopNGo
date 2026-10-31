import { NextRequest, NextResponse } from "next/server";
import { frequentlyBoughtTogether, toBaskets } from "@/features/analytics";
import { loadTransactions } from "@/features/analytics/dataSource";
import { listingIdForSlug, publicListingsByIds } from "@/features/analytics/server";

/**
 * GET /api/analytics/frequently-bought-together?slug=<product-slug>&limit=4
 * Public: returns only aggregate association statistics, never customer data.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.trim();
  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
  const limit = Math.min(10, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 4));

  try {
    const { transactions, source } = await loadTransactions();
    const listingId = await listingIdForSlug(slug, source);
    if (!listingId) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const rules = frequentlyBoughtTogether(toBaskets(transactions), listingId, limit, {
      minSupport: 0.01,
      minConfidence: 0.05,
    });
    const listings = await publicListingsByIds(rules.map((r) => r.consequent[0]), source);
    const items = listings.map((listing) => {
      const rule = rules.find((r) => r.consequent[0] === listing.id)!;
      return { listing, confidence: rule.confidence, lift: rule.lift, support: rule.support };
    });
    return NextResponse.json({ slug, items, source });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
