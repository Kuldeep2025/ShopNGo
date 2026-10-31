/**
 * Loads mining transactions from the database (paid-and-later orders only),
 * falling back to deterministic sample data in demo mode.
 */
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { generateSampleTransactions } from "./sampleData";
import type { AnalyticsSource, Transaction } from "./types";

const COUNTED_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export async function loadTransactions(
  options: { sinceDays?: number } = {}
): Promise<{ transactions: Transaction[]; source: AnalyticsSource }> {
  const { sinceDays = 180 } = options;
  if (!isDatabaseConfigured() || !prisma) {
    return { transactions: generateSampleTransactions(), source: "sample" };
  }
  try {
    const since = new Date(Date.now() - sinceDays * 86_400_000);
    const orders = await prisma.order.findMany({
      where: { status: { in: [...COUNTED_STATUSES] }, createdAt: { gte: since } },
      select: {
        id: true,
        customerId: true,
        createdAt: true,
        totalAmount: true,
        items: { select: { listingId: true, titleSnapshot: true, priceSnapshot: true, quantity: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 20_000,
    });
    if (orders.length === 0) {
      return { transactions: generateSampleTransactions(), source: "sample-fallback" };
    }
    return {
      source: "database",
      transactions: orders.map((o) => ({
        orderId: o.id,
        customerId: o.customerId,
        createdAt: o.createdAt,
        total: Number(o.totalAmount),
        items: o.items.map((it) => ({
          listingId: it.listingId,
          title: it.titleSnapshot,
          quantity: it.quantity,
          unitPrice: Number(it.priceSnapshot),
        })),
      })),
    };
  } catch {
    return { transactions: generateSampleTransactions(), source: "sample-fallback" };
  }
}

export { toBaskets } from "./baskets";
