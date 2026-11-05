import { computeEffectivePrice } from "@/features/pricing/effectivePrice";
import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { isPubliclyVisible } from "@/features/catalogue";

/**
 * GET /api/cart – current user's cart with live listing data
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ items: [], source: "no-db" });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: true,
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ items: [], cartId: cart?.id ?? null });
    }

    // Load listings for cart items
    const listingIds = cart.items.map((i) => i.listingId);
    const listings = await prisma.listing.findMany({
      where: { id: { in: listingIds } },
      include: {
        store: { select: { id: true, name: true, slug: true, isActive: true } },
      },
    });
    const listingMap = new Map(listings.map((l) => [l.id, l]));

    const items = cart.items.map((item) => {
      const listing = listingMap.get(item.listingId);
      const available = listing ? isPubliclyVisible(listing) : false;
      return {
        id: item.id,
        listingId: item.listingId,
        quantity: item.quantity,
        listing: listing
          ? {
              id: listing.id,
              title: listing.title,
              slug: listing.slug,
              price: computeEffectivePrice(listing).unitPrice,
              strikePrice: computeEffectivePrice(listing).strikePrice,
              percentOff: computeEffectivePrice(listing).percentOff,
              saleEndsAt: computeEffectivePrice(listing).saleEndsAt,
              currency: listing.currency,
              productType: listing.productType,
              stock: listing.stock,
              status: listing.status,
              store: listing.store,
              available,
            }
          : null,
      };
    });

    return NextResponse.json({ items, cartId: cart.id });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
