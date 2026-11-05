/** Shared pieces for the conversation routes. Server only. */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkSend, phaseOf, type Phase, type Sender, safeDisplayName, TOPIC_LABEL } from "./rules";
import { hasInDeliveryOrder, itemsWithPhase } from "./server";

export function failure(err: unknown, tag: string) {
  const status = (err as Error & { status?: number }).status ?? 500;
  if (status === 401) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (status === 403) return NextResponse.json({ error: "You do not have access to this." }, { status: 403 });
  console.error(`${tag} failed:`, err instanceof Error ? err.message.slice(-300) : err);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export type ConvRow = {
  id: string;
  customerId: string;
  storeId: string;
  listingId: string | null;
  orderItemId: string | null;
  topic: string;
};

/** Which side of the conversation is this user on, if any? Store owners are the seller side. */
export async function sideOf(userId: string, conv: { customerId: string; storeId: string }): Promise<Sender | null> {
  if (!prisma) return null;
  if (conv.customerId === userId) return "CUSTOMER";
  const store = await prisma.store.findUnique({ where: { id: conv.storeId }, select: { ownerId: true } });
  return store?.ownerId === userId ? "SELLER" : null;
}

/** Current phase of the thread: the ordered item's phase, or null for a question before buying. */
export async function threadPhase(conv: ConvRow): Promise<{ phase: Phase | null; inDelivery: boolean }> {
  if (conv.orderItemId) {
    const [item] = await itemsWithPhase(conv.customerId, { id: conv.orderItemId });
    return { phase: item?.phase ?? "CLOSED", inDelivery: false };
  }
  const inDelivery = conv.listingId ? await hasInDeliveryOrder(conv.customerId, conv.listingId) : false;
  return { phase: null, inDelivery };
}

export async function threadState(conv: ConvRow, sender: Sender) {
  const { phase, inDelivery } = await threadPhase(conv);
  const check = checkSend({ sender, phase, customerHasInDeliveryOrder: inDelivery, topic: conv.topic, body: "x", skipTopic: true });
  return {
    canSend: check.ok,
    paused: !check.ok && check.code === "PAUSED",
    reason: check.ok ? null : check.reason,
    phase: phase ?? (inDelivery ? "IN_DELIVERY" : "BEFORE_DELIVERY"),
  };
}

export { phaseOf, safeDisplayName, TOPIC_LABEL };
