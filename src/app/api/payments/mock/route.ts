import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { z } from "zod";

/**
 * POST /api/payments/mock
 * Mock payment adapter – demo/test only.
 * Browser cannot mark paid without going through this server path.
 * PAYMENTS_LIVE_ENABLED must remain false.
 */

const mockPaymentSchema = z.object({
  orderId: z.string().min(1),
  outcome: z.enum(["success", "failure", "cancel"]).default("success"),
});

export async function POST(req: NextRequest) {
  // Mock settlement is strictly local/test-only; never expose it in production.
  if (process.env.NODE_ENV === "production" || process.env.PAYMENTS_LIVE_ENABLED === "true") {
    return NextResponse.json(
      { error: "Mock payment settlement is disabled in production" },
      { status: 403 }
    );
  }

  try {
    const user = await requireUser(req.headers.get("authorization"));
    if (!isDatabaseConfigured() || !prisma) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const body = await req.json();
    const parsed = mockPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: parsed.data.orderId },
      include: { sellerOrders: true, items: true },
    });

    if (!order || order.customerId !== user.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "PENDING_PAYMENT") {
      // Idempotent – already processed
      return NextResponse.json({
        order,
        message: `Order already in status ${order.status}`,
        replayed: true,
      });
    }

    if (parsed.data.outcome !== "success") {
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: `MOCK_PAYMENT_${parsed.data.outcome.toUpperCase()}`,
          entity: "Order",
          entityId: order.id,
        },
      });
      return NextResponse.json({
        order,
        outcome: parsed.data.outcome,
        message: `Mock payment ${parsed.data.outcome}`,
      });
    }

    // Success path – mark paid
    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({
        where: { id: order.id, status: "PENDING_PAYMENT" },
        data: { status: "PAID", paymentProvider: "mock" },
      });
      if (changed.count !== 1) throw new Error("ORDER_STATE_CONFLICT");
      await tx.sellerOrder.updateMany({
        where: { orderId: order.id },
        data: { status: "PAID" },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "MOCK_PAYMENT_SUCCESS",
          entity: "Order",
          entityId: order.id,
          meta: {
            amount: order.totalAmount.toString(),
            currency: order.currency,
          },
        },
      });
      return tx.order.findUniqueOrThrow({ where: { id: order.id } });
    });

    return NextResponse.json({
      order: updated,
      outcome: "success",
      message: "Mock payment succeeded",
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ORDER_STATE_CONFLICT") {
      return NextResponse.json({ error: "Order is no longer awaiting payment" }, { status: 409 });
    }
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("mock payment error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
