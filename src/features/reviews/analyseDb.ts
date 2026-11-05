import { prisma, isDatabaseConfigured } from "@/lib/db";
import { analyseReviews, type ReviewSummary } from "./analyse";

/** Loads ALL reviews of a listing (not just the newest page) and analyses them. */
export async function loadReviewSummary(listingId: string): Promise<ReviewSummary | null> {
  if (!isDatabaseConfigured() || !prisma) return null;
  const rows = await prisma.review.findMany({
    where: { listingId },
    select: { rating: true, title: true, body: true, createdAt: true, user: { select: { displayName: true } } },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  return analyseReviews(rows.map((r) => ({ rating: r.rating, title: r.title, body: r.body, createdAt: r.createdAt, author: r.user.displayName })));
}
