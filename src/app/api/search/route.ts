import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import {
  filterPublicListings,
  toPublicListingDTO,
} from "@/features/catalogue";
import { searchQuerySchema } from "@/features/search/schema";
import { buildSearchWhere, buildSearchOrderBy } from "@/features/search/buildQuery";
import { searchDemoListings } from "@/lib/demo-data";

/**
 * GET /api/search
 * Real DB when configured; demo catalogue otherwise.
 */
export async function GET(req: NextRequest) {
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = searchQuerySchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid search parameters",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const q = parsed.data;
  if (
    q.minPrice !== undefined &&
    q.maxPrice !== undefined &&
    q.minPrice > q.maxPrice
  ) {
    return NextResponse.json(
      { error: "minPrice cannot be greater than maxPrice" },
      { status: 400 }
    );
  }

  if (!isDatabaseConfigured() || !prisma) {
    const listings = searchDemoListings({
      q: q.q,
      type: q.type,
      minPrice: q.minPrice,
      maxPrice: q.maxPrice,
      sort: q.sort,
    });
    return NextResponse.json({
      listings,
      nextCursor: null,
      count: listings.length,
      source: "demo",
    });
  }

  try {
    const where = buildSearchWhere(q);
    const orderBy = buildSearchOrderBy(q.sort);
    const limit = q.limit ?? 20;

    // Pages are offset based so every sort order paginates correctly.
    let offset = 0;
    if (q.cursor) {
      const decoded = Buffer.from(q.cursor, "base64url").toString("utf8");
      const m = /^o:(\d{1,7})$/.exec(decoded);
      if (!m) return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
      offset = Number(m[1]);
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: {
          store: {
            select: { id: true, name: true, slug: true, isActive: true },
          },
          category: { select: { id: true, name: true, slug: true } },
        },
        orderBy: [orderBy, { id: "desc" }],
        skip: offset,
        take: limit + 1,
      }),
      prisma.listing.count({ where }),
    ]);

    const visible = filterPublicListings(listings);
    const hasMore = visible.length > limit;
    const page = hasMore ? visible.slice(0, limit) : visible;

    // If DB is empty, show demo so the UI is not blank
    if (page.length === 0 && offset === 0 && total === 0 && !q.q && !q.type && !q.category && q.minPrice === undefined && q.maxPrice === undefined) {
      const demo = searchDemoListings({});
      return NextResponse.json({
        listings: demo,
        nextCursor: null,
        count: demo.length,
        source: "demo-fallback",
      });
    }

    const nextCursor = hasMore ? Buffer.from(`o:${offset + limit}`, "utf8").toString("base64url") : null;

    return NextResponse.json({
      listings: page.map(toPublicListingDTO),
      nextCursor,
      count: page.length,
      total,
      source: "database",
    });
  } catch (err) {
    console.error("search failed:", err instanceof Error ? err.message.slice(-300) : err);
    const listings = searchDemoListings({
      q: q.q,
      type: q.type,
      minPrice: q.minPrice,
      maxPrice: q.maxPrice,
      sort: q.sort,
    });
    return NextResponse.json({
      listings,
      nextCursor: null,
      count: listings.length,
      source: "demo-fallback",
    });
  }
}
