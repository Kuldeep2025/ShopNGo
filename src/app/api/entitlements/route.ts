import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";

/**
 * GET /api/entitlements
 * Digital entitlements granted only after trusted PAID status.
 * Never granted by browser claim or COD.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ entitlements: [], source: "no-db" });
    }

    // Find paid order items that are digital types
    const items = await prisma.orderItem.findMany({
      where: {
        order: {
          customerId: user.id,
          status: "PAID",
        },
        productType: { in: ["DIGITAL", "EBOOK", "E_NOTE", "COURSE"] },
      },
      include: {
        listing: { select: { id: true, title: true, slug: true } },
        order: { select: { id: true, createdAt: true } },
      },
    });

    const entitlements = items.map((item) => ({
      orderItemId: item.id,
      orderId: item.orderId,
      listingId: item.listingId,
      title: item.titleSnapshot,
      productType: item.productType,
      grantedAt: item.order.createdAt,
      // Private file URL would be generated server-side with entitlement check
      accessNote: "Access granted after trusted payment. File delivery via authenticated download.",
    }));

    return NextResponse.json({ entitlements });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
