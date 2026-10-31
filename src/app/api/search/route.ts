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

    let cursorClause: { createdAt: Date; id: string } | undefined;
    if (q.cursor) {
      try {
        const [ts, id] = Buffer.from(q.cursor, "base64url")
          .toString("utf8")
          .split("|");
        cursorClause = { createdAt: new Date(ts), id };
      } catch {
        return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
      }
    }

    const listings = await prisma.listing.findMany({
      where: {
        ...where,
        ...(cursorClause
          ? {
              OR: [
                { createdAt: { lt: cursorClause.createdAt } },
                {
                  createdAt: cursorClause.createdAt,
                  id: { lt: cursorClause.id },
                },
              ],
            }
          : {}),
      },
      include: {
        store: {
          select: { id: true, name: true, slug: true, isActive: true },
        },
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [orderBy, { id: "desc" }],
      take: limit + 1,
    });

    const visible = filterPublicListings(listings);
    const hasMore = visible.length > limit;
    const page = hasMore ? visible.slice(0, limit) : visible;

    // If DB is empty, show demo so the UI is not blank
    if (page.length === 0 && !q.q && !q.type && !q.minPrice && !q.maxPrice) {
      const demo = searchDemoListings({});
      return NextResponse.json({
        listings: demo,
        nextCursor: null,
        count: demo.length,
        source: "demo-fallback",
      });
    }

    let nextCursor: string | null = null;
    if (hasMore && page.length > 0) {
      const last = page[page.length - 1];
      nextCursor = Buffer.from(
        `${last.createdAt.toISOString()}|${last.id}`,
        "utf8"
      ).toString("base64url");
    }

    return NextResponse.json({
      listings: page.map(toPublicListingDTO),
      nextCursor,
      count: page.length,
      source: "database",
    });
  } catch {
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
