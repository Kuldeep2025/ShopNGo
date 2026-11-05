import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";

/**
 * GET /api/moderator/activity – one-screen overview of what needs attention and what just happened.
 * Moderators and admins only.
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole(req.headers.get("authorization"), ["MODERATOR", "ADMIN"]);
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
      pendingSellers,
      pendingListings,
      pendingDelivery,
      users,
      sellers,
      partners,
      listings,
      orders24h,
      ordersTotal,
      reviews24h,
      reviewsTotal,
      recentOrders,
      recentReviews,
      recentSellerApps,
      recentDeliveryApps,
      recentAudit,
      activeDeliveries,
    ] = await Promise.all([
      prisma.sellerApplication.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
      prisma.listing.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
      prisma.deliveryApplication.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
      prisma.user.count(),
      prisma.user.count({ where: { roles: { has: "SELLER" } } }),
      prisma.user.count({ where: { roles: { has: "DELIVERY_PARTNER" } } }),
      prisma.listing.count({ where: { status: "APPROVED" } }),
      prisma.order.count({ where: { createdAt: { gte: since } } }),
      prisma.order.count(),
      prisma.review.count({ where: { createdAt: { gte: since } } }),
      prisma.review.count(),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, status: true, totalAmount: true, currency: true, createdAt: true },
      }),
      prisma.review.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          rating: true,
          title: true,
          createdAt: true,
          listing: { select: { title: true } },
        },
      }),
      prisma.sellerApplication.findMany({
        where: { status: { not: "DRAFT" } },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: { id: true, status: true, businessName: true, updatedAt: true },
      }),
      prisma.deliveryApplication.findMany({
        where: { status: { not: "DRAFT" } },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: { id: true, status: true, fullName: true, city: true, vehicleType: true, updatedAt: true },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, action: true, entity: true, createdAt: true },
      }),
      prisma.delivery.count({ where: { status: { in: ["ASSIGNED", "PICKED_UP"] } } }),
    ]);

    return NextResponse.json({
      needsAttention: { sellerApplications: pendingSellers, listings: pendingListings, deliveryApplications: pendingDelivery },
      totals: {
        users,
        sellers,
        deliveryPartners: partners,
        approvedListings: listings,
        orders: ordersTotal,
        reviews: reviewsTotal,
        activeDeliveries,
      },
      last24Hours: { orders: orders24h, reviews: reviews24h },
      recentOrders: recentOrders.map((o) => ({ ...o, totalAmount: String(o.totalAmount) })),
      recentReviews: recentReviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        createdAt: r.createdAt,
        product: r.listing.title,
      })),
      recentSellerApplications: recentSellerApps,
      recentDeliveryApplications: recentDeliveryApps,
      recentAudit,
    });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("activity error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
