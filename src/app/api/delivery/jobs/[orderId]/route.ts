import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { errorResponse } from "@/features/delivery/errors";
import { geocodeAddress } from "@/features/delivery/geo";
import { z } from "zod";

type Ctx = { params: Promise<{ orderId: string }> };

const MAX_ACTIVE = 3;
const bodySchema = z.object({ action: z.enum(["claim", "pickup", "deliver", "release"]) });

/** claim an open order, mark it picked up, mark it delivered, or give it back. */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireRole(req.headers.get("authorization"), ["DELIVERY_PARTNER"]);
    if (!isDatabaseConfigured() || !prisma) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    const { orderId } = await ctx.params;
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    const { action } = parsed.data;

    const partner = await prisma.deliveryPartner.findUnique({ where: { userId: user.id } });
    if (!partner) return NextResponse.json({ error: "No delivery profile" }, { status: 404 });

    if (action === "claim") {
      if (!partner.isOnline) return NextResponse.json({ error: "Go online before taking an order." }, { status: 409 });
      const active = await prisma.delivery.count({ where: { partnerId: partner.id, status: { in: ["ASSIGNED", "PICKED_UP"] } } });
      if (active >= MAX_ACTIVE) {
        return NextResponse.json({ error: `You already have ${MAX_ACTIVE} active deliveries. Finish one first.` }, { status: 409 });
      }
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, status: true, shippingAddress: true, customerId: true },
      });
      if (!order || !["PAID", "PROCESSING", "SHIPPED"].includes(order.status)) {
        return NextResponse.json({ error: "This order is not available for delivery." }, { status: 404 });
      }
      if (order.customerId === user.id) {
        return NextResponse.json({ error: "You cannot deliver your own order." }, { status: 409 });
      }
      const dest = await geocodeAddress(order.shippingAddress as Record<string, unknown> | null);
      try {
        const delivery = await prisma.delivery.create({
          data: { orderId, partnerId: partner.id, destLat: dest?.lat ?? null, destLng: dest?.lng ?? null },
        });
        await prisma.auditLog.create({ data: { actorId: user.id, action: "DELIVERY_CLAIMED", entity: "Delivery", entityId: delivery.id } });
        return NextResponse.json({ delivery });
      } catch (e) {
        if ((e as { code?: string }).code === "P2002") {
          return NextResponse.json({ error: "Another partner just took this order." }, { status: 409 });
        }
        throw e;
      }
    }

    const delivery = await prisma.delivery.findUnique({ where: { orderId } });
    if (!delivery || delivery.partnerId !== partner.id) {
      return NextResponse.json({ error: "This delivery is not yours." }, { status: 404 });
    }

    if (action === "release") {
      if (delivery.status !== "ASSIGNED") return NextResponse.json({ error: "Only an order you have not picked up can be given back." }, { status: 409 });
      await prisma.delivery.delete({ where: { id: delivery.id } });
      return NextResponse.json({ released: true });
    }

    if (action === "pickup") {
      if (delivery.status !== "ASSIGNED") return NextResponse.json({ error: `Cannot pick up a delivery that is ${delivery.status.toLowerCase().replace("_", " ")}.` }, { status: 409 });
      const updated = await prisma.$transaction(async (tx) => {
        const d = await tx.delivery.update({ where: { id: delivery.id }, data: { status: "PICKED_UP", pickedUpAt: new Date() } });
        await tx.order.updateMany({ where: { id: orderId, status: { in: ["PAID", "PROCESSING"] } }, data: { status: "SHIPPED" } });
        await tx.sellerOrder.updateMany({ where: { orderId, status: { in: ["PAID", "PROCESSING"] } }, data: { status: "SHIPPED" } });
        return d;
      });
      return NextResponse.json({ delivery: updated });
    }

    // deliver
    if (delivery.status !== "PICKED_UP") return NextResponse.json({ error: "Pick the order up before marking it delivered." }, { status: 409 });
    const updated = await prisma.$transaction(async (tx) => {
      const d = await tx.delivery.update({ where: { id: delivery.id }, data: { status: "DELIVERED", deliveredAt: new Date() } });
      await tx.order.update({ where: { id: orderId }, data: { status: "DELIVERED" } });
      await tx.sellerOrder.updateMany({ where: { orderId }, data: { status: "DELIVERED" } });
      await tx.deliveryPartner.update({ where: { id: partner.id }, data: { deliveriesDone: { increment: 1 } } });
      await tx.auditLog.create({ data: { actorId: user.id, action: "DELIVERY_COMPLETED", entity: "Delivery", entityId: d.id } });
      return d;
    });
    return NextResponse.json({ delivery: updated });
  } catch (err) {
    return errorResponse(err);
  }
}
