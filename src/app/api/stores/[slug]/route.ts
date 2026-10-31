import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import {
  toPublicListingDTO,
  toPublicStoreDTO,
  filterPublicListings,
} from "@/features/catalogue";
import { DEMO_LISTINGS } from "@/lib/demo-data";

type Ctx = { params: Promise<{ slug: string }> };

/**
 * GET /api/stores/:slug
 * Returns public store + its approved listings only.
 */
export async function GET(_req: NextRequest, context: Ctx) {
  const { slug } = await context.params;

  if (!isDatabaseConfigured() || !prisma) {
    const listings = DEMO_LISTINGS.filter((listing) => listing.store.slug === slug);
    if (listings.length) {
      const first = listings[0];
      return NextResponse.json({
        store: { ...first.store, description: null, logoUrl: null },
        listings,
        source: "demo",
      });
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const store = await prisma.store.findFirst({
      where: { slug, isActive: true },
      include: {
        listings: {
          where: { status: "APPROVED" },
          include: {
            store: { select: { id: true, name: true, slug: true, isActive: true } },
            category: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!store) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const dto = toPublicStoreDTO(store);
    if (!dto) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const visible = filterPublicListings(store.listings);

    return NextResponse.json({
      store: dto,
      listings: visible.map(toPublicListingDTO),
    });
  } catch (err) {
    console.error("store fetch error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
