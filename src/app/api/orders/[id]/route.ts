import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET   /api/orders/:id
 * PATCH /api/orders/:id – cancel or address change (policy-gated)
 */
export async function GET(req: NextRequest, context: Ctx) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    const { id } = await context.params;
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        sellerOrders: { include: { store: { select: { id: true, name: true, slug: true } } } },
        items: true,
      },
    });

    if (!order || order.customerId !== user.id) {
      // Also allow seller to see their seller-orders – simplified: owner only for now
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

const patchSchema = z.object({
  action: z.enum(["cancel", "change_address"]),
  addressId: z.string().optional(),
  reason: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest, context: Ctx) {
  try {
    const user = await requireUser(req.headers.get("authorization"));
    const { id } = await context.params;
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.customerId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.action === "cancel") {
      // Cancellable only while PENDING_PAYMENT or PAID (before processing lock)
      if (!["PENDING_PAYMENT", "PAID"].includes(order.status)) {
        return NextResponse.json(
          {
            error: "Cancellation not allowed",
            reason: `Order is in status ${order.status}. Cancellation is only available before processing begins.`,
          },
          { status: 409 }
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const changed = await tx.order.updateMany({
          where: { id, status: { in: ["PENDING_PAYMENT", "PAID"] } },
          data: { status: "CANCELLED" },
        });
        if (changed.count !== 1) throw new Error("ORDER_STATE_CONFLICT");
        const items = await tx.orderItem.findMany({
          where: { orderId: id, productType: "PHYSICAL" },
          select: { listingId: true, quantity: true },
        });
        for (const item of items) {
          const listing = await tx.listing.findUnique({
            where: { id: item.listingId },
            select: { stock: true },
          });
          if (listing?.stock !== null && listing?.stock !== undefined) {
            await tx.listing.update({
              where: { id: item.listingId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
        await tx.sellerOrder.updateMany({
          where: { orderId: id },
          data: { status: "CANCELLED" },
        });
        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: "ORDER_CANCELLED",
            entity: "Order",
            entityId: id,
            meta: { reason: parsed.data.reason, previousStatus: order.status },
          },
        });
        return tx.order.findUniqueOrThrow({ where: { id } });
      });

      return NextResponse.json({ order: updated });
    }

    if (parsed.data.action === "change_address") {
      // Within 24h and pre-lock (PENDING_PAYMENT or PAID only)
      const ageMs = Date.now() - order.createdAt.getTime();
      const within24h = ageMs < 24 * 60 * 60 * 1000;
      if (!within24h) {
        return NextResponse.json(
          {
            error: "Address change not allowed",
            reason: "More than 24 hours have passed since order creation.",
          },
          { status: 409 }
        );
      }
      if (!["PENDING_PAYMENT", "PAID"].includes(order.status)) {
        return NextResponse.json(
          {
            error: "Address change not allowed",
            reason: `Order is in status ${order.status} and is locked for fulfilment.`,
          },
          { status: 409 }
        );
      }
      if (!parsed.data.addressId) {
        return NextResponse.json({ error: "addressId required" }, { status: 400 });
      }

      const address = await prisma.address.findUnique({
        where: { id: parsed.data.addressId },
      });
      if (!address || address.userId !== user.id) {
        return NextResponse.json({ error: "Invalid address" }, { status: 400 });
      }

      const snapshot = {
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        lat: address.lat,
        lng: address.lng,
      };

      const updated = await prisma.order.update({
        where: { id },
        data: { shippingAddress: snapshot },
      });

      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: "ORDER_ADDRESS_CHANGED",
          entity: "Order",
          entityId: id,
        },
      });

      return NextResponse.json({ order: updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    if (err instanceof Error && err.message === "ORDER_STATE_CONFLICT") {
      return NextResponse.json({ error: "Order state changed; refresh and try again" }, { status: 409 });
    }
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("order patch error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
