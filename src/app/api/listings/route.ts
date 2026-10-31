import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import {
  filterPublicListings,
  toPublicListingDTO,
} from "@/features/catalogue";
import { DEMO_LISTINGS } from "@/lib/demo-data";

/**
 * GET /api/listings – public approved listings (demo when DB off)
 */
export async function GET(req: NextRequest) {
  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") ?? 20),
    50
  );

  if (!isDatabaseConfigured() || !prisma) {
    return NextResponse.json({
      listings: DEMO_LISTINGS.slice(0, limit),
      source: "demo",
    });
  }

  try {
    const listings = await prisma.listing.findMany({
      where: { status: "APPROVED", store: { isActive: true } },
      include: {
        store: {
          select: { id: true, name: true, slug: true, isActive: true },
        },
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const visible = filterPublicListings(listings);
    if (visible.length === 0) {
      return NextResponse.json({
        listings: DEMO_LISTINGS.slice(0, limit),
        source: "demo-fallback",
      });
    }

    return NextResponse.json({
      listings: visible.map(toPublicListingDTO),
      source: "database",
    });
  } catch {
    return NextResponse.json({
      listings: DEMO_LISTINGS.slice(0, limit),
      source: "demo-fallback",
    });
  }
}
