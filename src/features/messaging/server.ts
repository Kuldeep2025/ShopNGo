/** Database helpers shared by the messaging and review routes. Server only. */
import { prisma } from "@/lib/db";
import { phaseOf, type Phase } from "./rules";

const itemInclude = {
  order: { select: { id: true, status: true, customerId: true, delivery: { select: { status: true, deliveredAt: true } } } },
  sellerOrder: { select: { status: true, storeId: true } },
  listing: { select: { id: true, title: true, slug: true, storeId: true, returnDays: true, warrantyMonths: true } },
} as const;

export type ItemWithPhase = {
  id: string;
  orderId: string;
  listingId: string;
  title: string;
  phase: Phase;
  storeId: string;
  deliveredAt: Date | null;
  returnDays: number | null;
};

/** Every ordered item the customer has for the given listings, with its delivery phase. */
export async function itemsWithPhase(customerId: string, where: { listingId?: string; orderId?: string; id?: string }): Promise<ItemWithPhase[]> {
  if (!prisma) return [];
  const rows = await prisma.orderItem.findMany({
    where: { ...where, order: { customerId } },
    include: itemInclude,
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    orderId: r.orderId,
    listingId: r.listingId,
    title: r.titleSnapshot,
    phase: phaseOf({
      orderStatus: r.order.status,
      sellerOrderStatus: r.sellerOrder?.status ?? null,
      deliveryStatus: r.order.delivery?.status ?? null,
    }),
    storeId: r.sellerOrder?.storeId ?? r.listing.storeId,
    deliveredAt: r.order.delivery?.deliveredAt ?? null,
    returnDays: r.listing.returnDays,
  }));
}

/** True when the customer has this product in an order that was delivered (a verified delivered purchase). */
export async function hasDeliveredPurchase(customerId: string, listingId: string): Promise<boolean> {
  const items = await itemsWithPhase(customerId, { listingId });
  return items.some((i) => i.phase === "DELIVERED");
}

/** Does the customer have an order for this product that is out for delivery right now? */
export async function hasInDeliveryOrder(customerId: string, listingId: string): Promise<boolean> {
  const items = await itemsWithPhase(customerId, { listingId });
  return items.some((i) => i.phase === "IN_DELIVERY");
}
