import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { isPubliclyVisible, toPublicListingDTO } from "@/features/catalogue";

/**
 * GET /api/compare?ids=id1,id2,id3
 * Structured product comparison – numeric comparisons calculated in code.
 * Only approved public listings.
 */
export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);

  if (ids.length < 2) {
    return NextResponse.json(
      { error: "Provide at least 2 listing ids (max 4) as ?ids=a,b,c" },
      { status: 400 }
    );
  }

  if (!isDatabaseConfigured() || !prisma) {
    return NextResponse.json({ products: [], source: "no-db" });
  }

  try {
    const listings = await prisma.listing.findMany({
      where: { id: { in: ids } },
      include: {
        store: { select: { id: true, name: true, slug: true, isActive: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    const visible = listings.filter(isPubliclyVisible).map(toPublicListingDTO);

    // Server-calculated price comparison
    const prices = visible.map((v) => Number(v.price));
    const minPrice = prices.length ? Math.min(...prices) : null;
    const maxPrice = prices.length ? Math.max(...prices) : null;

    return NextResponse.json({
      products: visible,
      comparison: {
        priceRange:
          minPrice !== null
            ? { min: minPrice.toFixed(2), max: maxPrice!.toFixed(2), currency: "INR" }
            : null,
        count: visible.length,
        missing: ids.filter((id) => !visible.find((v) => v.id === id)),
      },
    });
  } catch (err) {
    console.error("compare error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
