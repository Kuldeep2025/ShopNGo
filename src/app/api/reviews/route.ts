import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { createReviewSchema } from "@/features/reviews/schema";

/**
 * GET  /api/reviews?listingId= – public reviews for a listing
 * POST /api/reviews – create verified-purchase review
 */
export async function GET(req: NextRequest) {
  const listingId = req.nextUrl.searchParams.get("listingId");
  if (!listingId) {
    return NextResponse.json({ error: "listingId required" }, { status: 400 });
  }
  if (!isDatabaseConfigured() || !prisma) {
    return NextResponse.json({ reviews: [], source: "no-db" });
  }

  const reviews = await prisma.review.findMany({
    where: { listingId },
    include: {
      user: { select: { displayName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      createdAt: r.createdAt,
      author: r.user.displayName ?? "Customer",
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const body = await req.json();
    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify purchase: order item must belong to user, be PAID, match listing
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: parsed.data.orderItemId },
      include: { order: true },
    });

    if (
      !orderItem ||
      orderItem.order.customerId !== user.id ||
      orderItem.order.status !== "PAID" ||
      orderItem.listingId !== parsed.data.listingId
    ) {
      return NextResponse.json(
        { error: "Verified purchase required. Only paid purchases can be reviewed." },
        { status: 403 }
      );
    }

    // One review per purchased item (unique constraint)
    try {
      const review = await prisma.review.create({
        data: {
          listingId: parsed.data.listingId,
          userId: user.id,
          rating: parsed.data.rating,
          title: parsed.data.title,
          body: parsed.data.body,
        },
      });
      return NextResponse.json({ review }, { status: 201 });
    } catch {
      return NextResponse.json(
        { error: "You have already reviewed this item" },
        { status: 409 }
      );
    }
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
