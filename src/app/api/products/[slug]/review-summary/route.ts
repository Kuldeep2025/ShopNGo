import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { loadReviewSummary } from "@/features/reviews/analyseDb";

type Ctx = { params: Promise<{ slug: string }> };

/** GET /api/products/<slug or id>/review-summary – analysis of every review of a public product. */
export async function GET(_req: NextRequest, context: Ctx) {
  const { slug } = await context.params;
  if (!isDatabaseConfigured() || !prisma) return NextResponse.json({ error: "Not available" }, { status: 503 });
  try {
    const listing = await prisma.listing.findFirst({
      where: { OR: [{ slug }, { id: slug }], status: "APPROVED", store: { isActive: true } },
      select: { id: true, title: true },
    });
    if (!listing) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    const summary = await loadReviewSummary(listing.id);
    return NextResponse.json(
      { listingId: listing.id, title: listing.title, summary },
      { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } }
    );
  } catch (err) {
    console.error("review summary error:", err instanceof Error ? err.message.slice(-200) : err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
