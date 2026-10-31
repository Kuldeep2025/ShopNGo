import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { getAggregateFulfillmentStatus, getNextFulfillmentStatus } from "@/features/orders/transitions";
import { z } from "zod";

/**
 * GET   /api/seller/orders – seller's seller-orders
 * PATCH /api/seller/orders – update fulfilment status
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req.headers.get("authorization"), ["SELLER", "ADMIN"]);
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ orders: [], source: "no-db" });
    }
    const store = await prisma.store.findFirst({ where: { ownerId: user.id } });
    if (!store) return NextResponse.json({ orders: [] });

    const orders = await prisma.sellerOrder.findMany({
      where: { storeId: store.id },
      include: {
        order: { select: { id: true, customerId: true, shippingAddress: true, createdAt: true } },
        items: true,
        store: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ orders });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

const statusSchema = z.object({
  sellerOrderId: z.string().min(1),
  status: z.enum(["PROCESSING", "SHIPPED", "DELIVERED"]),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireRole(req.headers.get("authorization"), ["SELLER", "ADMIN"]);
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const body = await req.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const so = await prisma.sellerOrder.findUnique({
      where: { id: parsed.data.sellerOrderId },
      include: { store: true },
    });
    if (!so || so.store.ownerId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (getNextFulfillmentStatus(so.status) !== parsed.data.status) {
      return NextResponse.json(
        { error: `Invalid status transition from ${so.status} to ${parsed.data.status}` },
        { status: 409 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.sellerOrder.updateMany({
        where: { id: so.id, status: so.status },
        data: { status: parsed.data.status },
      });
      if (changed.count !== 1) throw new Error("SELLER_ORDER_STATE_CONFLICT");
      const siblingOrders = await tx.sellerOrder.findMany({
        where: { orderId: so.orderId },
        select: { status: true },
      });
      const parentStatus = siblingOrders.every((item) => item.status !== "CANCELLED")
        ? getAggregateFulfillmentStatus(siblingOrders.map((item) => item.status))
        : null;
      if (parentStatus) {
        await tx.order.updateMany({
          where: { id: so.orderId, status: { in: ["PAID", "PROCESSING", "SHIPPED"] } },
          data: { status: parentStatus },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: `SELLER_ORDER_${parsed.data.status}`,
          entity: "SellerOrder",
          entityId: so.id,
        },
      });
      return tx.sellerOrder.findUniqueOrThrow({ where: { id: so.id } });
    });

    return NextResponse.json({ sellerOrder: updated });
  } catch (err) {
    if (err instanceof Error && err.message === "SELLER_ORDER_STATE_CONFLICT") {
      return NextResponse.json({ error: "Order status changed; refresh and try again" }, { status: 409 });
    }
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
