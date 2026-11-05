import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { getSessionUser, requireUser } from "@/lib/auth/session";
import { createReviewSchema, VERIFIED_ORDER_STATUSES } from "@/features/reviews/schema";
import { analyseReviews } from "@/features/reviews/analyse";
import { hasDeliveredPurchase } from "@/features/messaging/server";
import { REVIEW_GATE_TEXT } from "@/features/messaging/rules";

export const dynamic = "force-dynamic";

/** Ids of users who bought this listing in a paid (or later) order. */
async function buyerIds(listingId: string, userIds: string[]): Promise<Set<string>> {
  if (!prisma || userIds.length === 0) return new Set();
  const rows = await prisma.orderItem.findMany({
    where: { listingId, order: { customerId: { in: userIds }, status: { in: [...VERIFIED_ORDER_STATUSES] } } },
    select: { order: { select: { customerId: true } } },
  });
  return new Set(rows.map((r) => r.order.customerId));
}

/**
 * GET  /api/reviews?listingId= – every public review, a summary, and the caller's own review when signed in
 * POST /api/reviews – signed-in members rate and review a product (posting again edits their review)
 */
export async function GET(req: NextRequest) {
  const listingId = req.nextUrl.searchParams.get("listingId");
  if (!listingId) {
    return NextResponse.json({ error: "listingId required" }, { status: 400 });
  }
  if (!isDatabaseConfigured() || !prisma) {
    return NextResponse.json({ reviews: [], summary: analyseReviews([]), source: "no-db" });
  }
  try {
    const rows = await prisma.review.findMany({
      where: { listingId },
      include: { user: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    const buyers = await buyerIds(listingId, rows.map((r) => r.userId));
    const me = await getSessionUser(req.headers.get("authorization")).catch(() => null);
    const summary = analyseReviews(
      rows.map((r) => ({ rating: r.rating, title: r.title, body: r.body, createdAt: r.createdAt, author: r.user.displayName }))
    );
    const canReview = me ? await hasDeliveredPurchase(me.id, listingId) : false;
    return NextResponse.json({
      canReview,
      gateText: REVIEW_GATE_TEXT,
      reviews: rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        createdAt: r.createdAt,
        author: r.user.displayName ?? "Customer",
        verified: buyers.has(r.userId),
        mine: me ? r.userId === me.id : false,
      })),
      summary: { count: summary.count, average: summary.average, distribution: summary.distribution },
    });
  } catch (err) {
    console.error("reviews load failed:", err instanceof Error ? err.message.slice(-200) : err);
    return NextResponse.json({ reviews: [], summary: analyseReviews([]), error: "Could not load reviews" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ error: "Reviews are not available right now." }, { status: 503 });
    }

    const body = await req.json().catch(() => null);
    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please choose a rating from 1 to 5 stars.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const listing = await prisma.listing.findFirst({
      where: { id: parsed.data.listingId, status: "APPROVED", store: { isActive: true } },
      select: { id: true },
    });
    if (!listing) {
      return NextResponse.json(
        { error: "This sample product is not stored in the shop, so it cannot be reviewed." },
        { status: 404 }
      );
    }

    // Only customers whose order for this product has been delivered may review it (new reviews and edits).
    if (!(await hasDeliveredPurchase(user.id, listing.id))) {
      return NextResponse.json({ error: REVIEW_GATE_TEXT, code: "NOT_DELIVERED" }, { status: 403 });
    }

    const data = {
      rating: parsed.data.rating,
      title: parsed.data.title || null,
      body: parsed.data.body || null,
    };
    const existing = await prisma.review.findUnique({
      where: { listingId_userId: { listingId: listing.id, userId: user.id } },
      select: { id: true },
    });
    const review = existing
      ? await prisma.review.update({ where: { id: existing.id }, data })
      : await prisma.review.create({ data: { ...data, listingId: listing.id, userId: user.id } });
    const verified = (await buyerIds(listing.id, [user.id])).has(user.id);
    return NextResponse.json({ review, verified, updated: Boolean(existing) }, { status: existing ? 200 : 201 });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Please sign in to post a review." }, { status: 401 });
    console.error("review post failed:", err instanceof Error ? err.message.slice(-300) : err);
    return NextResponse.json({ error: "Something went wrong while saving your review. Please try again." }, { status: 500 });
  }
}
