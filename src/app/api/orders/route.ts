import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { isPubliclyVisible } from "@/features/catalogue";
import { createOrderSchema } from "@/features/orders/create";
import { multiplyMoney, addMoney } from "@/features/cart/quote";
import { computeEffectivePrice } from "@/features/pricing/effectivePrice";

/**
 * GET  /api/orders – list current user's orders
 * POST /api/orders – create order from cart (Idempotency-Key required)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ orders: [], source: "no-db" });
    }
    const orders = await prisma.order.findMany({
      where: { customerId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        sellerOrders: { include: { store: { select: { id: true, name: true, slug: true } } } },
        items: true,
      },
      take: 50,
    });
    return NextResponse.json({ orders });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let idempotencyPaymentRef: string | null = null;
  try {
    const user = await requireUser(req.headers.get("authorization"));
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const idempotencyKey = req.headers.get("idempotency-key");
    if (!idempotencyKey || idempotencyKey.length < 8) {
      return NextResponse.json(
        { error: "Idempotency-Key header required (min 8 chars)" },
        { status: 400 }
      );
    }
    idempotencyPaymentRef = `idem:${user.id}:${idempotencyKey}`;

    // Idempotent replay
    const existing = await prisma.order.findFirst({
      where: { customerId: user.id, paymentRef: idempotencyPaymentRef },
      include: { sellerOrders: true, items: true },
    });
    if (existing) {
      return NextResponse.json({ order: existing, replayed: true });
    }

    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const address = await prisma.address.findUnique({
      where: { id: parsed.data.addressId },
    });
    if (!address || address.userId !== user.id) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: true },
    });
    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const listingIds = cart.items.map((i) => i.listingId);
    const listings = await prisma.listing.findMany({
      where: { id: { in: listingIds } },
      include: { store: true },
    });
    const listingMap = new Map(listings.map((l) => [l.id, l]));

    // Validate all items
    for (const item of cart.items) {
      const listing = listingMap.get(item.listingId);
      if (!listing || !isPubliclyVisible(listing)) {
        return NextResponse.json(
          { error: `Product unavailable: ${listing?.title ?? item.listingId}` },
          { status: 409 }
        );
      }
      if (
        listing.productType === "PHYSICAL" &&
        listing.stock !== null &&
        item.quantity > listing.stock
      ) {
        return NextResponse.json(
          { error: `Insufficient stock for ${listing.title}` },
          { status: 409 }
        );
      }
    }

    // Price is always worked out here from the listing and the current time, never taken from the browser.
    const orderedAt = new Date();
    const unitPriceOf = (listing: (typeof listings)[number]) => computeEffectivePrice(listing, orderedAt).unitPrice;

    // Group by store
    const byStore = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      const listing = listingMap.get(item.listingId)!;
      const arr = byStore.get(listing.storeId) ?? [];
      arr.push(item);
      byStore.set(listing.storeId, arr);
    }

    const addressSnapshot = {
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      lat: address.lat,
      lng: address.lng,
    };

    const order = await prisma.$transaction(async (tx) => {
      // Re-check stock inside transaction and decrement
      for (const item of cart.items) {
        const listing = listingMap.get(item.listingId)!;
        if (listing.productType === "PHYSICAL" && listing.stock !== null) {
          const updated = await tx.listing.updateMany({
            where: {
              id: listing.id,
              stock: { gte: item.quantity },
            },
            data: { stock: { decrement: item.quantity } },
          });
          if (updated.count === 0) {
            throw new Error(`STOCK_CONFLICT:${listing.title}`);
          }
        }
      }

      const lineTotals: string[] = [];
      const allItemData: {
        listingId: string;
        storeId: string;
        titleSnapshot: string;
        priceSnapshot: string;
        quantity: number;
        productType: string;
      }[] = [];

      for (const item of cart.items) {
        const listing = listingMap.get(item.listingId)!;
        const unit = unitPriceOf(listing);
        const lineTotal = multiplyMoney(unit, item.quantity);
        lineTotals.push(lineTotal);
        allItemData.push({
          listingId: listing.id,
          storeId: listing.storeId,
          titleSnapshot: listing.title,
          priceSnapshot: unit,
          quantity: item.quantity,
          productType: listing.productType,
        });
      }

      const totalAmount = addMoney(lineTotals);

      const parent = await tx.order.create({
        data: {
          customerId: user.id,
          status: "PENDING_PAYMENT",
          totalAmount,
          currency: "INR",
          shippingAddress: addressSnapshot,
          paymentProvider: "mock",
          paymentRef: idempotencyPaymentRef,
        },
      });

      for (const [storeId, storeItems] of byStore) {
        const storeLineTotals = storeItems.map((item) => {
          const listing = listingMap.get(item.listingId)!;
          return multiplyMoney(unitPriceOf(listing), item.quantity);
        });
        const subtotal = addMoney(storeLineTotals);

        const sellerOrder = await tx.sellerOrder.create({
          data: {
            orderId: parent.id,
            storeId,
            status: "PENDING_PAYMENT",
            subtotal,
          },
        });

        for (const item of storeItems) {
          const d = allItemData.find(
            (x) => x.listingId === item.listingId && x.storeId === storeId
          )!;
          await tx.orderItem.create({
            data: {
              orderId: parent.id,
              sellerOrderId: sellerOrder.id,
              listingId: d.listingId,
              titleSnapshot: d.titleSnapshot,
              priceSnapshot: d.priceSnapshot,
              quantity: d.quantity,
              productType: d.productType as never,
            },
          });
        }
      }

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "ORDER_CREATED",
          entity: "Order",
          entityId: parent.id,
          meta: { totalAmount, stores: byStore.size },
        },
      });

      return tx.order.findUnique({
        where: { id: parent.id },
        include: { sellerOrders: true, items: true },
      });
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    if (
      idempotencyPaymentRef &&
      typeof err === "object" && err !== null && "code" in err && err.code === "P2002"
    ) {
      const replay = await prisma?.order.findUnique({
        where: { paymentRef: idempotencyPaymentRef },
        include: { sellerOrders: true, items: true },
      });
      if (replay) return NextResponse.json({ order: replay, replayed: true });
    }
    const msg = err instanceof Error ? err.message : "";
    if (msg.startsWith("STOCK_CONFLICT:")) {
      return NextResponse.json(
        { error: `Stock conflict: ${msg.replace("STOCK_CONFLICT:", "")}` },
        { status: 409 }
      );
    }
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("order create error:", msg);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
